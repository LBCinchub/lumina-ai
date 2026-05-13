import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export default function CollaborativeCodeEditor({ code, projectId, collaborators, currentUser, onCodeChange }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <span style={{ fontSize: '12px', color: '#64748B' }}>Code Editor</span>
        <button
          onClick={handleCopy}
          style={{
            background: 'none',
            border: 'none',
            color: '#64748B',
            cursor: 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          {copied ? <Check style={{ width: '16px', height: '16px' }} /> : <Copy style={{ width: '16px', height: '16px' }} />}
        </button>
      </div>
      <textarea
        value={code}
        onChange={(e) => onCodeChange(e.target.value)}
        style={{
          flex: 1,
          background: '#13131C',
          color: '#E2E8F0',
          border: 'none',
          padding: '16px',
          fontFamily: 'monospace',
          fontSize: '13px',
          lineHeight: '1.6',
          resize: 'none',
          outline: 'none',
        }}
        placeholder="HTML, CSS, and JavaScript code here…"
      />
    </div>
  );
}