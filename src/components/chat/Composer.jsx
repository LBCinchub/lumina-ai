import React, { useRef, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Composer({ value, onChange, onSubmit, disabled, placeholder = "Speak plainly." }) {
  const textareaRef = useRef(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }, [value]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !disabled) onSubmit();
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
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          disabled={disabled}
          className={cn(
            "flex-1 bg-transparent resize-none outline-none",
            "text-[15px] leading-relaxed placeholder:text-muted-foreground/60",
            "scrollbar-minimal"
          )}
          style={{ maxHeight: '200px' }}
        />
        <button
          onClick={onSubmit}
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
}