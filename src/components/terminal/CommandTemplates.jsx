import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Play, Plus, Trash2, Zap } from 'lucide-react';

// Saved command templates — persist a command string once, then trigger the
// whole operation with a single click. Private to the signed-in account.
export default function CommandTemplates({ onRun, prefillCommand, busy }) {
  const [templates, setTemplates] = useState(null); // null = loading
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [command, setCommand] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setTemplates(await base44.entities.TerminalCommandTemplate.list('-created_date', 100));
    } catch (_) {
      setError('Could Not Load Your Templates — Please Try Again.');
      setTemplates([]);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setName('');
    setCommand(prefillCommand || '');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    const trimmedCommand = command.trim();
    if (!trimmedName || !trimmedCommand || saving) return;
    setSaving(true);
    setError(null);
    try {
      await base44.entities.TerminalCommandTemplate.create({
        name: trimmedName,
        command: trimmedCommand,
      });
      setDialogOpen(false);
      await load();
    } catch (_) {
      setError('Could Not Save The Template — Please Try Again.');
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    setError(null);
    try {
      await base44.entities.TerminalCommandTemplate.delete(id);
      setTemplates(prev => prev.filter(t => t.id !== id));
    } catch (_) {
      setError('Could Not Delete The Template — Please Try Again.');
    }
  };

  return (
    <div className="border-t border-border bg-muted/20 px-4 py-3">
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-pink-400" strokeWidth={1.75} />
          <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            Command Templates
          </span>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-1.5 font-mono text-[11px] text-purple-300 hover:text-purple-200 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Save Command
        </button>
      </div>

      {error && <p className="font-mono text-[11px] text-red-400 mb-2">{error}</p>}

      {templates === null ? (
        <div className="flex justify-center py-2">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground/50" />
        </div>
      ) : templates.length === 0 ? (
        <p className="font-mono text-[11px] text-muted-foreground/70">
          No Templates Yet — Save A Command To Run It With One Click.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {templates.map(t => (
            <div
              key={t.id}
              className="flex items-center rounded-lg border border-purple-400/25 bg-purple-500/5 hover:bg-purple-500/15 transition-colors"
            >
              <button
                onClick={() => onRun(t.command)}
                disabled={busy}
                title={t.command}
                className="flex items-center gap-2 px-3 py-1.5 text-left disabled:opacity-50"
              >
                <Play className="w-3 h-3 text-pink-400 shrink-0" />
                <span className="font-mono text-[11.5px] text-foreground">{t.name}</span>
                <span className="hidden md:inline font-mono text-[10.5px] text-muted-foreground max-w-48 truncate">
                  {t.command}
                </span>
              </button>
              <button
                onClick={() => handleDelete(t.id)}
                className="p-1.5 mr-1 text-muted-foreground/50 hover:text-red-400 transition-colors"
                title="Delete Template"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open && !saving) setDialogOpen(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save Command Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">
                Template Name
              </label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={60}
                placeholder="Morning Briefing"
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 font-mono text-[12.5px] outline-none focus:border-pink-400/50"
              />
            </div>
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">
                Command
              </label>
              <input
                value={command}
                onChange={e => setCommand(e.target.value)}
                placeholder="/ask Summarize My Week And Priorities"
                spellCheck={false}
                autoComplete="off"
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 font-mono text-[12.5px] outline-none focus:border-pink-400/50"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !name.trim() || !command.trim()}>
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}