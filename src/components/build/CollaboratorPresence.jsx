import React from 'react';
import { cn } from '@/lib/utils';
import { Users } from 'lucide-react';

export default function CollaboratorPresence({ collaborators, currentUserEmail }) {
  const activeCollaborators = collaborators.filter(c => c.user_email !== currentUserEmail);

  if (activeCollaborators.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/60 border border-border/50">
      <Users className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.75} />
      <div className="flex items-center gap-1">
        {activeCollaborators.slice(0, 3).map(collab => (
          <div
            key={collab.id}
            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
            style={{ backgroundColor: collab.color }}
            title={collab.user_name}
          >
            {collab.user_name?.charAt(0).toUpperCase() || '?'}
          </div>
        ))}
        {activeCollaborators.length > 3 && (
          <span className="text-[10px] text-muted-foreground ml-1">
            +{activeCollaborators.length - 3}
          </span>
        )}
      </div>
      <span className="text-[10px] text-muted-foreground">
        {activeCollaborators.length === 1 ? '1 editing' : `${activeCollaborators.length} editing`}
      </span>
    </div>
  );
}