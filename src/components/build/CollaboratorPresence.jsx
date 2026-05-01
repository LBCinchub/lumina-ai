import React from 'react';
import { cn } from '@/lib/utils';

function getInitials(email = '') {
  return email.split('@')[0].slice(0, 2).toUpperCase();
}

export default function CollaboratorPresence({ collaborators = [], currentUserEmail }) {
  const others = collaborators.filter(c => c.user_email !== currentUserEmail);
  if (others.length === 0) return null;

  return (
    <div className="flex items-center gap-1 ml-2">
      {others.slice(0, 4).map((c, i) => (
        <div
          key={c.id || i}
          title={c.user_name || c.user_email}
          className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white border-2 border-background",
            "-ml-1 first:ml-0"
          )}
          style={{ background: c.color || '#6366f1' }}
        >
          {getInitials(c.user_email)}
        </div>
      ))}
      {others.length > 4 && (
        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold bg-muted text-muted-foreground border-2 border-background -ml-1">
          +{others.length - 4}
        </div>
      )}
    </div>
  );
}