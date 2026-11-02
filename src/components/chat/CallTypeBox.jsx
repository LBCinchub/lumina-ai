import React from 'react';
import { ArrowUp } from 'lucide-react';

// Typing instead of talking when the mic is unavailable. The reply is still
// spoken and captioned, so the call keeps going turn by turn.
export default function CallTypeBox({ value, onChange, onSend, disabled }) {
  const canSend = !!value.trim() && !disabled;
  const submit = (e) => {
    e.preventDefault();
    if (canSend) onSend();
  };
  return (
    <div className="w-full max-w-sm px-6">
      <form
        onSubmit={submit}
        className="flex items-center gap-2 rounded-full border border-border bg-card py-1 pl-5 pr-1 focus-within:border-foreground/30"
      >
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type Your Message"
          aria-label="Type your message"
          enterKeyHint="send"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground/60"
        />
        <button
          type="submit"
          disabled={!canSend}
          aria-label="Send"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
        </button>
      </form>
    </div>
  );
}