import React from 'react';
import { Textarea } from '@/components/ui/textarea';

export default function ContextField({ label, hint, value, onChange, placeholder, rows = 4 }) {
  return (
    <div className="border-t border-border pt-8 first:border-t-0 first:pt-0">
      <div className="grid md:grid-cols-[200px_1fr] gap-4 md:gap-10">
        <div>
          <h3 className="font-serif text-lg tracking-tight text-foreground mb-1">{label}</h3>
          {hint && <p className="text-xs text-muted-foreground leading-relaxed">{hint}</p>}
        </div>
        <div>
          <Textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            className="resize-none bg-card border-border/70 focus-visible:ring-1 focus-visible:ring-foreground/20 text-[15px] leading-relaxed"
          />
        </div>
      </div>
    </div>
  );
}