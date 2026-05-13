import React, { useState } from 'react';
import { Github } from 'lucide-react';

export default function GitHubSyncPanel({ project, onUpdate }) {
  const [repo, setRepo] = useState(project?.github_repo || '');
  const [path, setPath] = useState(project?.github_path || '');
  const [autoSync, setAutoSync] = useState(project?.github_auto_sync || false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate({
        github_repo: repo,
        github_path: path,
        github_auto_sync: autoSync,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '500px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <Github style={{ width: '20px', height: '20px' }} />
        <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>GitHub Sync</h2>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '12px', marginBottom: '6px', color: '#64748B' }}>
          Repository (owner/repo)
        </label>
        <input
          type="text"
          value={repo}
          onChange={(e) => setRepo(e.target.value)}
          placeholder="e.g., myname/myrepo"
          style={{
            width: '100%',
            padding: '8px 12px',
            background: '#13131C',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '8px',
            color: '#E2E8F0',
            fontSize: '13px',
            boxSizing: 'border-box',
          }}
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '12px', marginBottom: '6px', color: '#64748B' }}>
          File Path
        </label>
        <input
          type="text"
          value={path}
          onChange={(e) => setPath(e.target.value)}
          placeholder="e.g., src/index.html"
          style={{
            width: '100%',
            padding: '8px 12px',
            background: '#13131C',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '8px',
            color: '#E2E8F0',
            fontSize: '13px',
            boxSizing: 'border-box',
          }}
        />
      </div>

      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input
          type="checkbox"
          checked={autoSync}
          onChange={(e) => setAutoSync(e.target.checked)}
          style={{ cursor: 'pointer' }}
        />
        <label style={{ fontSize: '13px', color: '#E2E8F0', cursor: 'pointer' }}>
          Auto-sync on save
        </label>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          width: '100%',
          padding: '12px',
          background: '#00FFA3',
          color: '#060609',
          border: 'none',
          borderRadius: '8px',
          fontWeight: '600',
          cursor: saving ? 'not-allowed' : 'pointer',
          opacity: saving ? 0.6 : 1,
        }}
      >
        {saving ? 'Saving…' : 'Save Configuration'}
      </button>
    </div>
  );
}