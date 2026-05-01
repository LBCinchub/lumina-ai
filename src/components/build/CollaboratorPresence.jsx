import React from 'react';
import { cn } from '@/lib/utils';

export default function CollaboratorPresence({ collaborators, currentUserEmail }) {
  const others = collaborators.filter(c => c.user_email !== currentUserEmail);
  if (others.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 ml-auto">
      <span className="text-xs text-muted-foreground/60 mr-1">{others.length} online</span>
      <div className="flex -space-x-1.5">
        {others.slice(0, 5).map((c, i) => (
          <div
            key={c.user_email}
            title={c.user_name || c.user_email}
            className="w-6 h-6 rounded-full border-2 border-background flex items-center justify-center text-[10px] font-bold text-white"
            style={{ backgroundColor: c.color || '#4ECDC4', zIndex: 5 - i }}
          >
            {(c.user_name || c.user_email || '?')[0].toUpperCase()}
          </div>
        ))}
      </div>
    </div>
  );
}