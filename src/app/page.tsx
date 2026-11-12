'use client';

import { useState } from 'react';
import FormMode from '@/components/FormMode';
import WebhookMode from '@/components/WebhookMode';
import { Sparkles, BookOpen } from 'lucide-react';
import clsx from 'clsx';

type Mode = 'form' | 'webhook';

const MODE_DESCRIPTIONS: Record<Mode, { title: string; description: string }> = {
  form: {
    title: 'Form Mode',
    description: 'Enter a topic and optionally pick a platform and format. The request is sent to a Make.com scenario that generates 500-800 word content and an AI image stored on Google Drive.',
  },
  webhook: {
    title: 'Webhook Mode',
    description: 'Full API documentation for the Make.com webhook. Request/response schemas, all 12 error codes, scenario flow, and a live test panel.',
  },
};

export default function HomePage() {
  const [mode, setMode] = useState<Mode>('form');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
              <Sparkles size={16} aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-bold leading-none text-gray-900">AI Content Generator</p>
              <p className="text-[10px] text-gray-400">Make.com · GPT-5-mini · GPT Image 2</p>
            </div>
          </div>

          <div className="flex gap-1 rounded-xl bg-gray-100 p-1" role="tablist" aria-label="Mode selector">
            {(['form', 'webhook'] as Mode[]).map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={mode === m}
                onClick={() => setMode(m)}
                className={clsx(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                  mode === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {m === 'form' ? <Sparkles size={12} /> : <BookOpen size={12} />}
                {m === 'form' ? 'Form Mode' : 'Webhook Mode'}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h1 className="mb-1 text-lg font-bold text-gray-900">{MODE_DESCRIPTIONS[mode].title}</h1>
          <p className="text-sm text-gray-500">{MODE_DESCRIPTIONS[mode].description}</p>
        </div>

        {mode === 'form' ? <FormMode /> : <WebhookMode onSwitchToForm={() => setMode('form')} />}
      </main>

      <footer className="border-t border-gray-100 py-6 text-center text-xs text-gray-400">
        AI Content Generator · Next.js · Make.com · GPT-5-mini · GPT Image 2 · Deployed on Vercel
      </footer>
    </div>
  );
}
