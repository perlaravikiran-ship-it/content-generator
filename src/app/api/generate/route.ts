import { NextRequest, NextResponse } from 'next/server';
import { MAKECOM_WEBHOOK_URL } from '@/lib/utils/constants';
import type { ApiResponse, MakeComResponse } from '@/types';

export const maxDuration = 300;

/**
 * Fix unescaped control characters inside JSON string values.
 * Make.com substitutes template variables ({{149.result}}) that contain
 * markdown with real newlines, producing invalid JSON. This function
 * walks the string tracking whether we're inside a quoted string and
 * escapes newlines/tabs/carriage returns that appear inside string literals.
 */
function fixJsonControlChars(json: string): string {
  let result = '';
  let inString = false;
  let escaped = false;

  for (let i = 0; i < json.length; i++) {
    const ch = json[i];

    if (escaped) {
      result += ch;
      escaped = false;
      continue;
    }

    if (ch === '\\') {
      result += ch;
      escaped = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      result += ch;
      continue;
    }

    if (inString && ch === '\n') {
      result += '\\n';
      continue;
    }

    if (inString && ch === '\r') {
      result += '\\r';
      continue;
    }

    if (inString && ch === '\t') {
      result += '\\t';
      continue;
    }

    result += ch;
  }

  return result;
}

/**
 * POST /api/generate
 * Proxies the request to the Make.com webhook and returns the response.
 *
 * Body: { topic: string, platform?: string, format?: string }
 */
export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<MakeComResponse>>> {
  let body: Record<string, unknown>;

  try {
    body = await req.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: 'Request body must be valid JSON' },
      { status: 400 }
    );
  }

  // Validate required fields
  if (!body.topic || typeof body.topic !== 'string' || body.topic.trim().length < 5) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: 'topic is required and must be at least 5 characters',
      },
      { status: 422 }
    );
  }

  try {
    const makeComResponse = await fetch(MAKECOM_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: body.topic,
        platform: body.platform ?? '',
        format: body.format ?? '',
      }),
    });

    // Make.com may return JSON with literal newlines inside string values
    // (from the content field containing markdown). Get raw text and fix it.
    const rawText = await makeComResponse.text();
    const fixedJson = fixJsonControlChars(rawText);

    let data: MakeComResponse;
    try {
      data = JSON.parse(fixedJson) as MakeComResponse;
    } catch {
      // If fixing didn't work, return the raw text so the client can see it
      console.error('[/api/generate] JSON parse failed even after fix. Raw text length:', rawText.length);
      return NextResponse.json(
        { success: false, data: null, error: 'Received malformed response from Make.com' },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { success: true, data, error: null },
      { status: makeComResponse.status }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to reach Make.com webhook';
    console.error('[/api/generate]', message);
    return NextResponse.json(
      { success: false, data: null, error: 'Failed to reach Make.com webhook. Check if the scenario is active.' },
      { status: 502 }
    );
  }
}
