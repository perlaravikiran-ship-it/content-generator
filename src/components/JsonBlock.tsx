'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface Props {
  value: unknown;
  label?: string;
  maxHeight?: string;
}

export default function JsonBlock({ value, label, maxHeight = '400px' }: Props) {
  const [copied, setCopied] = useState(false);
  const json = JSON.stringify(value, null, 2);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-700 bg-gray-950">
      {label && (
        <div className="flex items-center justify-between border-b border-gray-700 px-4 py-2">
          <span className="font-mono text-xs text-gray-400">{label}</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            aria-label="Copy JSON"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      )}
      <pre className="overflow-auto p-4 font-mono text-xs leading-relaxed text-green-400" style={{ maxHeight }}>
        {json}
      </pre>
    </div>
  );
}
