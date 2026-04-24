import React from 'react';

const colorMap = {
  0: 'bg-red-500',
  1: 'bg-blue-500',
  2: 'bg-green-500',
  3: 'bg-purple-500',
  4: 'bg-yellow-500',
  5: 'bg-pink-500',
};

export default function CursorTracker({ collaborators, currentUserEmail }) {
  if (!collaborators || collaborators.length === 0) {
    return null;
  }

  const otherCollaborators = collaborators.filter(c => c.user_email !== currentUserEmail);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {otherCollaborators.map((collab, idx) => {
        const cursor = collab.cursor_position;
        if (!cursor) return null;

        const xPercent = (cursor.column / 100) * 100;
        const yPercent = (cursor.line / 100) * 100;
        const colorClass = colorMap[idx % 6];

        return (
          <div key={collab.id} className="absolute">
            <div
              className={`w-1 h-6 ${colorClass} rounded-sm opacity-70 transition-all duration-150`}
              style={{
                left: `${xPercent}%`,
                top: `${yPercent}%`,
                transform: 'translateX(-50%)',
              }}
            >
              <div className={`absolute top-0 left-0 text-[10px] font-semibold text-white ${colorClass} px-1.5 py-0.5 rounded whitespace-nowrap -translate-y-full -translate-x-1/2`}>
                {collab.user_name}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}