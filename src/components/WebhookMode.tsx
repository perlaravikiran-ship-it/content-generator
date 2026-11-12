'use client';

import { useState } from 'react';
import JsonBlock from './JsonBlock';
import {
  ERROR_CODES, CONTENT_FORMATS,
  PLATFORM_OPTIONS, MAKECOM_WEBHOOK_URL, RETRY_BEHAVIOR,
} from '@/lib/utils/constants';
import { BookOpen, AlertTriangle, Sparkles, Copy, Check } from 'lucide-react';
import clsx from 'clsx';

type Tab = 'overview' | 'errors' | 'try';

interface Props {
  onSwitchToForm: () => void;
}

const SAMPLE_REQUEST = {
  topic: 'The rise of AI agents in 2025',
  platform: 'linkedin',
  format: 'Trend Analysis',
};

const SAMPLE_SUCCESS = {
  success: true,
  message: 'Task completed successfully',
  data: {
    content: '# The Rise of AI Agents in 2025\\n\\n## Introduction\\n\\nArtificial intelligence agents are reshaping...',
    imageUrl: 'https://drive.google.com/uc?id=1aBcDeFgHiJkLmN&export=download',
  },
};

const SAMPLE_ERROR = {
  success: false,
  message: 'Request failed',
  error: {
    code: 'UNKNOWN_LANGUAGE',
    message: 'Topic is not provided in English Language, please provide in English Language',
    custom_message_from_service_provider: '',
    details: null,
  },
};

export default function WebhookMode({ onSwitchToForm }: Props) {
  const [tab, setTab] = useState<Tab>('overview');
  const [copiedUrl, setCopiedUrl] = useState(false);

  const copyUrl = async () => {
    await navigator.clipboard.writeText(MAKECOM_WEBHOOK_URL);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div className="space-y-5">
      {/* Webhook URL banner */}
      <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-indigo-500">Make.com Webhook Endpoint</p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-indigo-100 px-2 py-0.5 font-mono text-xs font-bold text-indigo-700">POST</span>
          <code className="break-all font-mono text-sm text-indigo-900">{MAKECOM_WEBHOOK_URL}</code>
          <button
            onClick={copyUrl}
            className="ml-auto flex items-center gap-1 rounded-lg bg-indigo-200 px-2 py-1 text-xs text-indigo-700 hover:bg-indigo-300 transition-colors"
          >
            {copiedUrl ? <Check size={12} /> : <Copy size={12} />}
            {copiedUrl ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1" role="tablist">
        {([
          { id: 'overview', label: 'Overview', icon: <BookOpen size={13} /> },
          { id: 'errors', label: 'Error Codes', icon: <AlertTriangle size={13} /> },
          { id: 'try', label: 'Try It', icon: <Sparkles size={13} /> },
        ] as { id: Tab; label: string; icon: React.ReactNode }[]).map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={clsx(
              'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition-all',
              tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === 'overview' && (
        <div className="space-y-5" role="tabpanel">
          <Section title="Request Payload">
            <JsonBlock value={SAMPLE_REQUEST} label="example-request.json" />
          </Section>

          <Section title="Success Response (200)">
            <JsonBlock value={SAMPLE_SUCCESS} label="success-response.json" />
          </Section>

          <Section title="Error Response (400)">
            <JsonBlock value={SAMPLE_ERROR} label="error-response.json" />
            <p className="text-xs text-gray-500">
              The <code className="text-purple-600">custom_message_from_service_provider</code> field is included on
              retry-failure errors and contains the raw error from OpenAI or Google Drive.
            </p>
          </Section>

          <Section title="cURL Example">
            <JsonBlock
              value={`curl -X POST ${MAKECOM_WEBHOOK_URL} \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(SAMPLE_REQUEST)}'`}
              label="curl.sh"
            />
          </Section>

          <Section title="Supported Formats">
            <div className="flex flex-wrap gap-2">
              {CONTENT_FORMATS.map((f) => (
                <span key={f} className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600">{f}</span>
              ))}
            </div>
          </Section>

          <Section title="Platform Options">
            <div className="flex flex-wrap gap-2">
              {PLATFORM_OPTIONS.map((p) => (
                <span key={p.id || 'general'} className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600">
                  {p.emoji} {p.name} <code className="text-gray-400">{p.id || '""'}</code>
                </span>
              ))}
            </div>
          </Section>

          <Section title="Content Rules (enforced by Make.com)">
            <ul className="space-y-1.5 text-sm text-gray-700">
              {[
                'Content is always 500-800 words',
                'Output is in Markdown format',
                'English language only',
                'No explicit or age-inappropriate content',
                'No hate speech, religion/caste/race promotion',
                'Topic must be at least 5 characters',
                'Empty platform = General Article Blog',
                'Image is generated, uploaded to Google Drive, and shared with a public link',
              ].map((rule) => (
                <li key={rule} className="flex gap-2"><span className="text-brand-500">•</span>{rule}</li>
              ))}
            </ul>
          </Section>
        </div>
      )}

      {/* ── Error Codes ── */}
      {tab === 'errors' && (
        <div className="space-y-4" role="tabpanel">
          <p className="text-sm text-gray-500">
            The Make.com scenario validates input and handles failures at every step.
          </p>

          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3">Error Code</th>
                  <th className="px-4 py-3">Message</th>
                  <th className="px-4 py-3">Trigger</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ERROR_CODES.map((err) => (
                  <tr key={err.code} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-red-100 px-2 py-0.5 font-mono text-xs font-bold text-red-700">{err.code}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{err.message}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{err.trigger}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-amber-700">
              <AlertTriangle size={14} /> Retry Behavior
            </h4>
            <p className="mb-3 text-sm text-amber-700">
              Every critical step sleeps <code className="font-mono mx-1 bg-amber-100 px-1 rounded">{RETRY_BEHAVIOR.sleepDuration}</code> then retries once.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-amber-300 text-left text-amber-600 uppercase tracking-wide">
                    <th className="px-3 py-2">Step</th>
                    <th className="px-3 py-2">First Attempt</th>
                    <th className="px-3 py-2">Retry (after 5s sleep)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-200">
                  {RETRY_BEHAVIOR.steps.map((s) => (
                    <tr key={s.step}>
                      <td className="px-3 py-2 font-medium text-amber-800">{s.step}</td>
                      <td className="px-3 py-2 text-amber-700">{s.firstAttempt}</td>
                      <td className="px-3 py-2 text-amber-600">{s.retry}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Try It → redirects to Form Mode ── */}
      {tab === 'try' && (
        <div className="rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 to-indigo-50 p-8 text-center" role="tabpanel">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 shadow-lg">
            <Sparkles size={24} className="text-white" aria-hidden="true" />
          </div>
          <h3 className="mb-2 text-lg font-bold text-gray-900">Generate Content</h3>
          <p className="mb-6 text-sm text-gray-500 max-w-sm mx-auto">
            Use the Form Mode to enter a topic, pick a platform and format, and generate content + an AI image in one click.
          </p>
          <button
            onClick={onSwitchToForm}
            className={clsx(
              'inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 font-semibold text-white shadow-md',
              'hover:bg-brand-700 hover:shadow-lg transition-all active:scale-[0.98]',
              'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2'
            )}
          >
            <Sparkles size={16} />
            Switch to Form Mode
          </button>
          <p className="mt-4 text-xs text-gray-400">
            Or send a request directly using the cURL example in the Overview tab.
          </p>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
      {children}
    </div>
  );
}
