import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

export default function HistorySidebar({ projectId, onRevert, onBranch }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    
    const loadHistory = async () => {
      setLoading(true);
      try {
        const data = await base44.entities.ProjectHistory.filter({ project_id: projectId }, '-created_date', 20);
        setHistory(data);
      } catch (e) {
        console.error('Failed to load history:', e);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [projectId]);

  if (!projectId) return <div style={{ padding: '20px', color: '#64748B' }}>No project selected</div>;

  return (
    <div style={{ padding: '16px', height: '100%', overflowY: 'auto' }}>
      <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '12px', color: '#E2E8F0' }}>History</div>
      {loading ? (
        <div style={{ color: '#64748B', fontSize: '12px' }}>Loading…</div>
      ) : history.length === 0 ? (
        <div style={{ color: '#64748B', fontSize: '12px' }}>No history yet</div>
      ) : (
        history.map((item, i) => (
          <div
            key={i}
            style={{
              padding: '8px',
              marginBottom: '6px',
              background: '#13131C',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '6px',
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            <div style={{ color: '#E2E8F0', marginBottom: '4px' }}>{item.title || 'Untitled'}</div>
            <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
              <button
                onClick={() => onRevert && onRevert(item)}
                style={{
                  padding: '4px 8px',
                  background: '#00FFA3',
                  color: '#060609',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '10px',
                  fontWeight: '600',
                }}
              >
                Revert
              </button>
              <button
                onClick={() => onBranch && onBranch(item)}
                style={{
                  padding: '4px 8px',
                  background: '#191924',
                  color: '#E2E8F0',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '10px',
                }}
              >
                Branch
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}