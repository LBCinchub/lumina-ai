import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { ArrowUp, Mic, MicOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSpeechInput } from '@/hooks/useSpeechInput';

const Composer = forwardRef(function Composer(
  { value, onChange, onSubmit, disabled, placeholder = "Speak plainly.", luminaSpeaking = false, onListeningChange },
  ref
) {
  const textareaRef = useRef(null);
  // Always-current refs so speech callbacks never close over stale props
  const onSubmitRef = useRef(onSubmit);
  const onChangeRef = useRef(onChange);
  useEffect(() => { onSubmitRef.current = onSubmit; }, [onSubmit]);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  const { listening, supported, toggle: toggleVoice, start: startVoice } = useSpeechInput({
    onTranscript: (text) => onChangeRef.current(text),
    onAutoSubmit: (text) => {
      onChangeRef.current('');
      onSubmitRef.current(text);
    },
  });

  useImperativeHandle(ref, () => ({ start: startVoice }), [startVoice]);

  useEffect(() => {
    onListeningChange?.(listening);
  }, [listening, onListeningChange]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }, [value]);

  const submit = () => {
    const text = value.trim();
    if (text && !disabled) {
      onChangeRef.current('');
      onSubmitRef.current(text);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="relative">
      <div className={cn(
        "relative flex items-end gap-2 bg-card border border-border rounded-2xl",
        "transition-all duration-300",
        "focus-within:border-foreground/30 focus-within:shadow-[0_2px_20px_-8px_hsl(var(--foreground)/0.15)]",
        "px-4 py-3"
      )}>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChangeRef.current(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={listening ? "Listening…" : luminaSpeaking ? "Lumina is speaking…" : placeholder}
          rows={1}
          disabled={disabled}
          className={cn(
            "flex-1 bg-transparent resize-none outline-none",
            "text-[15px] leading-relaxed placeholder:text-muted-foreground/60",
            "scrollbar-minimal"
          )}
          style={{ maxHeight: '200px' }}
        />
        {supported && (
          <button
            type="button"
            onClick={toggleVoice}
            disabled={disabled || luminaSpeaking}
            className={cn(
              "shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all",
              listening
                ? "bg-red-500/90 text-white animate-pulse"
                : luminaSpeaking
                  ? "text-foreground/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent",
              "disabled:cursor-not-allowed"
            )}
            aria-label={listening ? "Stop listening" : "Voice input"}
          >
            {listening
              ? <MicOff className="w-4 h-4" strokeWidth={2} />
              : <Mic className="w-4 h-4" strokeWidth={1.75} />
            }
          </button>
        )}
        <button
          onClick={submit}
          disabled={!value.trim() || disabled}
          className={cn(
            "shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
            "bg-foreground text-background transition-all",
            "hover:scale-105 disabled:opacity-30 disabled:hover:scale-100",
            "disabled:cursor-not-allowed"
          )}
          aria-label="Send"
        >
          <ArrowUp className="w-4 h-4" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
});

export default Composer;