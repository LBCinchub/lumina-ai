import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Play, Plus, Trash2, Zap } from 'lucide-react';

// Command templates manager — save command strings you run often, then trigger
// them in the Terminal with a single click. Private to the signed-in account.
export default function TemplateManager({ onRun }) {
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
    setCommand('');
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
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 md:px-5 py-4 border-b border-border flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Zap className="w-4 h-4 text-pink-400" strokeWidth={1.75} />
          <h2 className="text-sm font-medium">Your Templates</h2>
        </div>
        <Button size="sm" onClick={openNew}>
          <Plus className="w-3.5 h-3.5" /> New Template
        </Button>
      </div>

      {error && <div className="px-4 md:px-5 py-3 text-[12px] text-destructive">{error}</div>}

      <div className="divide-y divide-border">
        {templates === null ? (
          <div className="px-4 md:px-5 py-10 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground/50" strokeWidth={1.75} />
          </div>
        ) : templates.length === 0 ? (
          <div className="px-4 md:px-5 py-10 text-center text-[12px] text-muted-foreground">
            No Templates Yet — Save A Command To Trigger It In The Terminal With One Click.
          </div>
        ) : templates.map(t => (
          <div key={t.id} className="px-4 md:px-5 py-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <div className="text-[13px] font-medium">{t.name}</div>
              <div className="font-mono text-[11.5px] text-muted-foreground mt-1 break-all">{t.command}</div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button size="sm" onClick={() => onRun(t)}>
                <Play className="w-3.5 h-3.5" /> Run In Terminal
              </Button>
              <button
                onClick={() => handleDelete(t.id)}
                className="p-2 rounded-md text-muted-foreground/50 hover:text-red-400 hover:bg-accent/50 transition-colors"
                title="Delete Template"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open && !saving) setDialogOpen(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Command Template</DialogTitle>
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