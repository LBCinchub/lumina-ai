import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Settings, Plus, Trash2, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function EnvironmentConfig({ configs, onUpdate, userEmail }) {
  const [envVars, setEnvVars] = useState(configs.env_vars || []);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const addVar = () => {
    if (!newKey.trim()) return;
    const updated = [...envVars, { key: newKey, value: newValue }];
    setEnvVars(updated);
    setNewKey('');
    setNewValue('');
  };

  const removeVar = (idx) => {
    setEnvVars(envVars.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const updated = { ...configs, env_vars: envVars };
      onUpdate(updated);

      // Persist to UserContext
      const ctx = await base44.entities.UserContext.filter({ created_by: userEmail }).catch(() => []);
      if (ctx[0]) {
        await base44.entities.UserContext.update(ctx[0].id, {
          context_notes: JSON.stringify(updated),
        });
      } else {
        await base44.entities.UserContext.create({
          context_notes: JSON.stringify(updated),
        });
      }

      setMessage({ type: 'success', text: 'Configuration saved successfully' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Settings className="w-5 h-5 text-foreground/60" strokeWidth={1.75} />
          <h2 className="font-serif text-xl tracking-tight">Environment Configuration</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Manage environment variables used across staging, canary, and production deployments.
        </p>
      </div>

      {/* Messages */}
      {message && (
        <div className={cn(
          "mb-6 flex gap-3 p-4 rounded-lg border",
          message.type === 'success'
            ? 'bg-green-500/10 border-green-500/30'
            : 'bg-destructive/10 border-destructive/30'
        )}>
          {message.type === 'success' ? (
            <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          )}
          <p className={message.type === 'success' ? 'text-green-500' : 'text-destructive'}>
            {message.text}
          </p>
        </div>
      )}

      {/* Current Variables */}
      <div className="mb-8">
        <h3 className="font-medium mb-4">Variables</h3>
        {envVars.length === 0 ? (
          <p className="text-sm text-muted-foreground/70 py-4 text-center bg-muted/40 rounded-lg">
            No environment variables configured yet
          </p>
        ) : (
          <div className="space-y-2">
            {envVars.map((v, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
                <div className="flex-1 font-mono text-sm">
                  <span className="text-accent">{v.key}</span>
                  <span className="text-muted-foreground mx-2">=</span>
                  <span className="text-muted-foreground">{'•'.repeat(Math.min(v.value.length, 8))}</span>
                </div>
                <button
                  onClick={() => removeVar(idx)}
                  className="p-1.5 hover:bg-destructive/10 rounded text-destructive transition-colors"
                >
                  <Trash2 className="w-4 h-4" strokeWidth={1.75} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add New Variable */}
      <div className="mb-8 p-4 bg-muted/40 border border-border rounded-lg">
        <h3 className="font-medium mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Variable
        </h3>
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Variable name (e.g., DATABASE_URL)"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm"
          />
          <textarea
            placeholder="Value"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm resize-none"
          />
          <button
            onClick={addVar}
            disabled={!newKey.trim()}
            className={cn(
              "w-full px-4 py-2 rounded-lg font-medium transition-colors text-sm",
              "bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            Add Variable
          </button>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className={cn(
          "w-full px-6 py-3 rounded-lg font-medium transition-all text-sm",
          "bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed"
        )}
      >
        {saving ? 'Saving…' : 'Save Configuration'}
      </button>
    </div>
  );
}