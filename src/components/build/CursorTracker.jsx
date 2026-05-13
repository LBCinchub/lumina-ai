import React from 'react';

export default function CursorTracker({ collaborators, currentUserEmail }) {
  const others = collaborators.filter(c => c.user_email !== currentUserEmail);

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10 }}>
      {others.map((c, i) => {
        if (!c.cursor_position) return null;
        const { line, column } = c.cursor_position;
        
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: '2px',
              height: '20px',
              background: c.color || '#00FFA3',
              opacity: 0.7,
              left: `${column * 8}px`,
              top: `${line * 20}px`,
              title: c.user_name || c.user_email,
            }}
          />
        );
      })}
    </div>
  );
}