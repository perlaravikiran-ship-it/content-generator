'use client';

import { useState } from 'react';
import type { MakeComResponse } from '@/types';
import { CONTENT_FORMATS, PLATFORM_OPTIONS } from '@/lib/utils/constants';
import { Sparkles, AlertCircle, Download, Copy, Check, ImageIcon } from 'lucide-react';
import clsx from 'clsx';

/**
 * Convert any Google Drive URL to an embeddable preview URL for use in <iframe>.
 * Drive allows /preview endpoint to be embedded cross-origin.
 * Also returns the direct download URL separately.
 */
function getDriveUrls(url: string): { previewUrl: string; downloadUrl: string } {
  let fileId: string | null = null;

  // https://drive.google.com/uc?id=FILE_ID&export=download
  const ucMatch = url.match(/[?&]id=([^&]+)/);
  if (ucMatch) fileId = ucMatch[1];

  // https://drive.google.com/file/d/FILE_ID/view
  const fileMatch = url.match(/\/file\/d\/([^/?]+)/);
  if (fileMatch) fileId = fileMatch[1];

  if (fileId) {
    return {
      previewUrl: `https://drive.google.com/file/d/${fileId}/preview`,
      downloadUrl: `https://drive.google.com/uc?id=${fileId}&export=download`,
    };
  }

  return { previewUrl: url, downloadUrl: url };
}

export default function FormMode() {
  const [topic, setTopic] = useState('');
  const [platform, setPlatform] = useState('');
  const [format, setFormat] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MakeComResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (topic.trim().length < 5) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          platform: platform || '',
          format: format || '',
        }),
      });

      const json = await res.json() as { success: boolean; data?: MakeComResponse; error?: string };

      if (!json.success || !json.data) {
        setError(json.error ?? 'Generation failed');
        return;
      }

      setResult(json.data);

      if (!json.data.success) {
        setError(json.data.error?.message ?? 'Make.com returned an error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (result?.success) {
      await navigator.clipboard.writeText(result.data.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isSuccess = result?.success;

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Topic */}
        <div>
          <label htmlFor="topic" className="mb-1.5 block text-sm font-semibold text-gray-700">
            Topic <span className="text-red-500">*</span>
          </label>
          <textarea
            id="topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. The rise of AI agents in 2025"
            rows={3}
            maxLength={500}
            disabled={loading}
            className={clsx(
              'w-full resize-none rounded-xl border px-4 py-3 text-sm text-gray-800 shadow-sm',
              'placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500',
              error ? 'border-red-300' : 'border-gray-200'
            )}
            aria-describedby="topic-hint"
          />
          <p id="topic-hint" className="mt-1 text-xs text-gray-400">
            Minimum 5 characters. Must be in English.
          </p>
        </div>

        {/* Platform */}
        <div>
          <label htmlFor="platform" className="mb-1.5 block text-sm font-semibold text-gray-700">
            Platform <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <select
            id="platform"
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            disabled={loading}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {PLATFORM_OPTIONS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.emoji} {p.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-400">Leave as General Article Blog if not targeting a specific platform.</p>
        </div>

        {/* Format */}
        <div>
          <label htmlFor="format" className="mb-1.5 block text-sm font-semibold text-gray-700">
            Format <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <select
            id="format"
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            disabled={loading}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">Auto-select (based on topic)</option>
            {CONTENT_FORMATS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-400">
            If left empty, Make.com picks Article, Case Study, or Explainer based on the topic.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || topic.trim().length < 5}
          aria-busy={loading}
          className={clsx(
            'flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 font-semibold text-white transition-all',
            'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2',
            loading || topic.trim().length < 5
              ? 'cursor-not-allowed bg-gray-300'
              : 'bg-brand-600 shadow-md hover:bg-brand-700 hover:shadow-lg active:scale-[0.98]'
          )}
        >
          {loading ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generating content + image…
            </>
          ) : (
            <><Sparkles size={16} aria-hidden="true" /> Generate</>
          )}
        </button>
      </form>

      {/* Success result */}
      {result && isSuccess && (
        <div className="space-y-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900">Content Generated</h2>
            <button
              onClick={handleCopy}
              className={clsx(
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all',
                copied ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          {/* Content */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-700">
              {result.data.content}
            </pre>
          </div>

          {/* Image */}
          {result.data.imageUrl && (() => {
            const { previewUrl, downloadUrl } = getDriveUrls(result.data.imageUrl);
            return (
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                {/* Embedded Drive preview — works cross-origin via /preview endpoint */}
                <div className="relative bg-gray-100" style={{ paddingBottom: '56.25%' /* 16:9 */ }}>
                  <iframe
                    src={previewUrl}
                    title="AI generated image preview"
                    className="absolute inset-0 h-full w-full border-0"
                    allow="autoplay"
                    loading="lazy"
                  />
                </div>

                {/* Footer */}
                <div className="p-4 space-y-3 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <ImageIcon size={13} className="text-indigo-500" />
                    <p className="text-xs font-medium text-gray-500">AI-generated image · stored on Google Drive</p>
                  </div>
                  <a
                    href={downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={clsx(
                      'flex w-full items-center justify-center gap-2 rounded-xl',
                      'bg-brand-600 px-4 py-3 shadow-md',
                      'text-sm font-semibold text-white hover:bg-brand-700 transition-colors active:scale-[0.98]'
                    )}
                  >
                    <Download size={15} />
                    Download Image
                  </a>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Error result */}
      {result && !isSuccess && result.error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="rounded-md bg-red-600 px-2 py-0.5 text-xs font-mono font-bold text-white">
              {result.error.code}
            </span>
            <span className="text-xs text-red-500">{result.message}</span>
          </div>
          <p className="text-sm text-red-700">{result.error.message}</p>
          {result.error.custom_message_from_service_provider && (
            <p className="mt-2 text-xs text-gray-500">
              Provider: {result.error.custom_message_from_service_provider}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
