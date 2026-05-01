import React from 'react';
import { cn } from '@/lib/utils';

export default function CollaboratorPresence({ collaborators = [], currentUserEmail }) {
  const others = collaborators.filter(c => c.user_email !== currentUserEmail);
  if (others.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 ml-2">
      {others.slice(0, 5).map((c, i) => (
        <div
          key={c.user_email || i}
          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium text-white shrink-0"
          style={{ backgroundColor: c.color || '#6366f1' }}
          title={c.user_name || c.user_email}
        >
          {(c.user_name || c.user_email || '?')[0].toUpperCase()}
        </div>
      ))}
      {others.length > 5 && (
        <span className="text-[10px] text-muted-foreground">+{others.length - 5}</span>
      )}
    </div>
  );
}