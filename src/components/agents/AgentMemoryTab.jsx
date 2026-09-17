import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Brain, X, Loader2 } from 'lucide-react';

const callFn = async (name, payload) => {
  try {
    const res = await base44.functions.invoke(name, payload);
    const data = res?.data || res;
    if (data?.error) return { error: data.error };
    return { data };
  } catch (err) {
    const errData = err?.response?.data || err?.data || {};
    return { error: errData.error || 'Something Went Wrong. Please Try Again.' };
  }
};

// Persistent Memory tab — stable facts, preferences, and standing instructions
// the agent remembers across every conversation. All writes go through the
// server function (ownership + tier gating enforced server-side).
export default function AgentMemoryTab({ agent }) {
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await base44.entities.AgentMemory.filter({ agent_id: agent.id }, '-created_date', 50);
      setMemories(data);
    } catch (_) {
      setMemories([]);
    }
    setLoading(false);
  }, [agent.id]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!content.trim() || busy) return;
    setBusy(true);
    setError(null);
    const res = await callFn('manageAgentMemory', { agent_id: agent.id, action: 'add', content: content.trim() });
    if (res.error) {
      setError(res.error);
    } else {
      setContent('');
      load();
    }
    setBusy(false);
  };

  const handleRemove = async (id) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const res = await callFn('manageAgentMemory', { agent_id: agent.id, action: 'remove', memory_id: id });
    if (res.error) setError(res.error);
    else load();
    setBusy(false);
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-minimal">
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 space-y-5">
        <div>
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Brain className="w-4 h-4" strokeWidth={1.75} /> Persistent Memory
          </h3>
          <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
            Stable facts, preferences, and standing instructions this agent remembers across every conversation. Included with LBC AI Superagent.
          </p>
        </div>

        <div className="space-y-2">
          <Textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="E.g. Remember that I prefer concise bullet-point briefs."
            rows={2}
            maxLength={500}
            disabled={busy}
          />
          <Button size="sm" onClick={handleAdd} disabled={busy || !content.trim()}>
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Add Memory
          </Button>
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        {loading ? (
          <p className="text-xs text-muted-foreground">Loading Memories…</p>
        ) : memories.length === 0 ? (
          <p className="text-xs text-muted-foreground">No Memories Yet — Add The First One Above.</p>
        ) : (
          <div className="space-y-1.5">
            {memories.map(m => (
              <div key={m.id} className="flex items-start gap-2 rounded-lg border border-border px-3 py-2.5">
                <p className="text-xs leading-relaxed flex-1">{m.content}</p>
                <button
                  onClick={() => handleRemove(m.id)}
                  className="p-1 -m-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-accent/50 transition-colors shrink-0"
                  title="Remove Memory"
                >
                  <X className="w-3.5 h-3.5" strokeWidth={1.75} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}