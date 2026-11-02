import React from 'react';
import { cn } from '@/lib/utils';
import { stripMarkdown } from '@/hooks/useSpeechOutput';

// The call as text: what the mic is hearing while the user talks, otherwise
// the latest reply, so the call can be followed with the sound off. A mic
// problem replaces both with what to do next.
export default function CallCaption({ micError, onRetryMic, transcript, reply }) {
  if (micError) {
    return (
      <div role="alert" className="max-w-xs px-6 text-center">
        <p className="text-sm text-destructive">{micError.message}</p>
        {micError.canRetry && (
          <button
            type="button"
            onClick={onRetryMic}
            className="mt-3 min-h-[44px] px-5 rounded-full border border-border text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Try Again
          </button>
        )}
      </div>
    );
  }
  const text = transcript || stripMarkdown(reply || '');
  if (!text) return null;
  return (
    <p className={cn(
      'max-w-md max-h-40 overflow-y-auto scrollbar-minimal px-6 text-center text-sm leading-relaxed',
      transcript ? 'text-foreground' : 'text-muted-foreground'
    )}>
      {text}
    </p>
  );
}