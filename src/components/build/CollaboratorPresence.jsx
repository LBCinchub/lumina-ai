import React from 'react';
import { Users } from 'lucide-react';

export default function CollaboratorPresence({ collaborators, currentUserEmail }) {
  const others = collaborators.filter(c => c.user_email !== currentUserEmail);

  if (others.length === 0) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <Users style={{ width: '16px', height: '16px', color: '#64748B' }} />
      <div style={{ display: 'flex', gap: '4px' }}>
        {others.map((c, i) => (
          <div
            key={i}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: c.color || '#00FFA3',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: '600',
              color: '#060609',
              title: c.user_name || c.user_email,
            }}
          >
            {(c.user_name || c.user_email).charAt(0).toUpperCase()}
          </div>
        ))}
      </div>
      <span style={{ fontSize: '11px', color: '#64748B' }}>{others.length} online</span>
    </div>
  );
}