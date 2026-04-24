import React from 'react';

export default function CollaboratorPresence({ collaborators = [], currentUserEmail }) {
  const others = collaborators.filter(c => c.user_email !== currentUserEmail);
  if (others.length === 0) return null;

  return (
    <div className="flex items-center gap-1 ml-2">
      {others.slice(0, 4).map((c, i) => (
        <div
          key={c.id || i}
          title={c.user_name || c.user_email}
          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium text-white border border-background"
          style={{ backgroundColor: c.color || '#6366f1', marginLeft: i > 0 ? '-6px' : 0 }}
        >
          {(c.user_name || c.user_email || '?')[0].toUpperCase()}
        </div>
      ))}
      {others.length > 4 && (
        <span className="text-[10px] text-muted-foreground ml-1">+{others.length - 4}</span>
      )}
    </div>
  );
}