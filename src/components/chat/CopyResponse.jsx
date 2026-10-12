import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export default function CopyResponse({ text }) {
  const [state, setState] = useState('idle'); // idle | copied | failed
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setState('copied');
    } catch (_) {
      setState('failed');
    }
    setTimeout(() => setState('idle'), 2000);
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1.5 min-h-[44px] min-w-[44px] px-2 -ml-2 rounded-md text-[12px] text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label="Copy Response"
    >
      {state === 'copied' ? <Check className="w-3.5 h-3.5" aria-hidden="true" /> : <Copy className="w-3.5 h-3.5" aria-hidden="true" />}
      <span aria-live="polite">{state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy Failed' : 'Copy'}</span>
    </button>
  );
}