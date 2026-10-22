import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

export default function DisclosureSection({ title, hint, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-xl border border-border bg-card">
      <CollapsibleTrigger className="w-full flex items-center justify-between gap-3 px-4 min-h-[52px] text-left rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <span>
          <span className="block text-sm font-medium">{title}</span>
          {hint && <span className="block text-xs text-muted-foreground mt-0.5">{hint}</span>}
        </span>
        <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform motion-reduce:transition-none', open && 'rotate-180')} aria-hidden="true" />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-4">{children}</CollapsibleContent>
    </Collapsible>
  );
}