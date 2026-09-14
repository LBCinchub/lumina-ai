import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, GitBranch, Zap, Info, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import moment from 'moment';

// Dashboard notification center — alerts for major terminal task completions
// and template pushes. Records are created server-side only (owner email
// stamped from the session); this component reads and marks them read.
// Realtime: entity subscription refreshes the list the moment a new
// notification lands.

const KIND_ICONS = {
  terminal_task: GitBranch,
  template_push: Zap,
  system: Info,
};

function timeAgo(date) {
  try {
    return moment(date).fromNow();
  } catch (_) {
    return '';
  }
}

export default function NotificationCenter({ className }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(null); // null = loading
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      const data = await base44.entities.UserNotification.list('-created_date', 50);
      setItems(data || []);
    } catch (_) {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    load();
    const unsubscribe = base44.entities.UserNotification.subscribe(() => load());
    return unsubscribe;
  }, [load]);

  const unread = (items || []).filter((n) => !n.is_read);

  const markAllRead = async () => {
    if (!unread.length) return;
    try {
      await base44.entities.UserNotification.updateMany(
        { is_read: false },
        { $set: { is_read: true } }
      );
    } catch (_) {}
    load();
  };

  const openItem = async (n) => {
    if (!n.is_read) {
      try {
        await base44.entities.UserNotification.update(n.id, { is_read: true });
      } catch (_) {}
    }
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'relative p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors',
            className
          )}
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" strokeWidth={1.5} />
          {unread.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-medium flex items-center justify-center">
              {unread.length > 9 ? '9+' : unread.length}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 rounded-xl border border-border bg-popover">
        <div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
          <span className="text-[13px] font-medium">Notifications</span>
          {unread.length > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <Check className="w-3 h-3" strokeWidth={2} />
              Mark All Read
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto scrollbar-minimal">
          {items === null ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground/50" strokeWidth={1.75} />
            </div>
          ) : items.length === 0 ? (
            <div className="py-8 text-center text-[12px] text-muted-foreground">
              No Notifications Yet — Terminal Task And Template Push Alerts Appear Here.
            </div>
          ) : (
            items.map((n) => {
              const Icon = KIND_ICONS[n.kind] || Info;
              return (
                <button
                  key={n.id}
                  onClick={() => openItem(n)}
                  className="w-full text-left px-3 py-2.5 flex items-start gap-2.5 hover:bg-accent/50 transition-colors border-b border-border last:border-0"
                >
                  <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0 text-pink-400" strokeWidth={1.75} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="text-[12.5px] font-medium truncate">{n.title}</span>
                      {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                    </span>
                    <span className="block text-[11.5px] text-muted-foreground leading-snug mt-0.5">
                      {n.body}
                    </span>
                    <span className="block text-[10px] text-muted-foreground/70 mt-1">
                      {timeAgo(n.created_date)}
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}