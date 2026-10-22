import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import ConversationList from './ConversationList';

// History lives in a drawer (Radix: focus trap, Escape, focus restore) so the
// conversation gets the main space. Search filters the already-loaded titles.
export default function ChatHistoryDrawer({ open, onOpenChange, conversations, ...listProps }) {
  const [q, setQ] = useState('');
  const term = q.trim().toLowerCase();
  const shown = term ? conversations.filter(c => (c.title || '').toLowerCase().includes(term)) : conversations;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[88vw] max-w-[340px] p-0 bg-sidebar flex flex-col">
        <SheetTitle className="px-5 pt-5 text-base font-medium">Chat History</SheetTitle>
        <SheetDescription className="sr-only">Your Past Threads</SheetDescription>
        <div className="px-5 pt-3">
          <label className="relative block">
            <span className="sr-only">Search Threads</span>
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search Threads"
              className="w-full h-11 pl-9 pr-3 rounded-lg border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
        </div>
        <ConversationList conversations={shown} {...listProps} />
      </SheetContent>
    </Sheet>
  );
}