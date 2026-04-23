import React from 'react';
import { cn } from '@/lib/utils';

export default function CursorTracker({ collaborators, currentUserEmail }) {
  const activeCursors = collaborators.filter(
    c => c.user_email !== currentUserEmail && c.cursor_position
  );

  if (activeCursors.length === 0) {
    return null;
  }

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
      {activeCursors.map(collab => (
        <div key={collab.id} className="absolute">
          {/* Cursor line */}
          <div
            className="absolute w-0.5 h-5 animate-pulse"
            style={{
              backgroundColor: collab.color,
              left: `${collab.cursor_position?.column * 8 || 0}px`,
              top: `${(collab.cursor_position?.line || 0) * 24}px`
            }}
          />
          
          {/* User label */}
          <div
            className="absolute text-[10px] font-medium px-1.5 py-0.5 rounded whitespace-nowrap text-white shadow-lg"
            style={{
              backgroundColor: collab.color,
              left: `${collab.cursor_position?.column * 8 || 0}px`,
              top: `${(collab.cursor_position?.line || 0) * 24 - 20}px`
            }}
          >
            {collab.user_name}
          </div>
        </div>
      ))}
    </div>
  );
}