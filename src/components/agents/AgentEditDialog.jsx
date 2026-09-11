import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { AGENT_VOICES } from './agentTemplates';

// Edit dialog for an existing agent. All changes go through the
// updateUserAgent backend function — ownership is verified server-side.
export default function AgentEditDialog({ agent, knowledgeSources, onClose, onSave }) {
  const [form, setForm] = useState({
    name: '', persona: '', voice: 'professional', expertise: '', instructions: '', knowledge_source_ids: [],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (agent) {
      setForm({
        name: agent.name || '',
        persona: agent.persona || '',
        voice: agent.voice || 'professional',
        expertise: agent.expertise || '',
        instructions: agent.instructions || '',
        knowledge_source_ids: Array.isArray(agent.knowledge_source_ids) ? agent.knowledge_source_ids : [],
      });
      setError(null);
      setSaving(false);
    }
  }, [agent]);

  const save = async () => {
    if (saving) return;
    if (!form.name.trim() || !form.persona.trim() || !form.instructions.trim()) {
      setError('Name, persona, and instructions are required.');
      return;
    }
    setSaving(true);
    setError(null);
    const result = await onSave(agent.id, {
      name: form.name.trim(),
      persona: form.persona.trim(),
      voice: form.voice,
      expertise: form.expertise.trim(),
      instructions: form.instructions.trim(),
      knowledge_source_ids: form.knowledge_source_ids,
    });
    if (result?.error) {
      setError(result.error);
      setSaving(false);
    }
    // On success the parent closes the dialog and unmounts it.
  };

  const toggleKnowledge = (id) => {
    setForm(f => ({
      ...f,
      knowledge_source_ids: f.knowledge_source_ids.includes(id)
        ? f.knowledge_source_ids.filter(k => k !== id)
        : [...f.knowledge_source_ids, id],
    }));
  };

  return (
    <Dialog open={!!agent} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto scrollbar-minimal">
        <DialogHeader>
          <DialogTitle>Edit Agent</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div>
            <label className="block text-[12px] font-medium mb-1.5">Name</label>
            <Input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              maxLength={60}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium mb-1.5">Persona</label>
              <Input
                value={form.persona}
                onChange={e => setForm(f => ({ ...f, persona: e.target.value }))}
                maxLength={80}
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium mb-1.5">Voice</label>
              <Select value={form.voice} onValueChange={v => setForm(f => ({ ...f, voice: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AGENT_VOICES.map(v => (
                    <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium mb-1.5">Expertise</label>
            <Input
              value={form.expertise}
              onChange={e => setForm(f => ({ ...f, expertise: e.target.value }))}
              maxLength={300}
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium mb-1.5">Instructions</label>
            <Textarea
              value={form.instructions}
              onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))}
              rows={6}
              maxLength={4000}
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium mb-1.5">Knowledge Sources</label>
            {knowledgeSources.length === 0 ? (
              <p className="text-[11.5px] text-muted-foreground">No Knowledge Sources yet.</p>
            ) : (
              <div className="rounded-lg border border-border/40 divide-y divide-border/30 max-h-40 overflow-y-auto scrollbar-minimal">
                {knowledgeSources.map(k => (
                  <label key={k.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-accent/30 transition-colors">
                    <Checkbox
                      checked={form.knowledge_source_ids.includes(k.id)}
                      onCheckedChange={() => toggleKnowledge(k.id)}
                    />
                    <span className="text-[12px] truncate">{k.title}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-[12px] text-destructive">{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-3.5 py-2 rounded-md text-[12px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-primary-foreground text-[12px] font-medium hover:opacity-90 transition-all disabled:opacity-50"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2} />}
              Save Changes
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}