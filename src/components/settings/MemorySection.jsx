import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Brain, Pencil, Trash2, RefreshCw, X, Check, Loader2, ShieldCheck } from 'lucide-react';
import MemoryControls from '@/components/settings/MemoryControls';

const REVIEW_LABELS = {
  needs_review: 'Not Used — Saved Before Consent Controls',
  scope_unknown: 'Not Used — Unknown Scope',
  inactive: 'Not Used — Inactive',
  contains_secret: 'Not Used — Looks Like A Credential',
  sensitive_not_consented: 'Not Used — Sensitive Memory Is Off',
};

// Memory — view, edit, and delete the durable facts, preferences, goals and
// decisions LBC AI remembers across conversations. Always reflects what is
// actually stored; nothing is claimed as saved unless the write succeeded.
export default function MemorySection() {
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [clearing, setClearing] = useState(false);
  const [settings, setSettings] = useState(null);
  const [savingSettings, setSavingSettings] = useState(false);

  const updateSettings = async (patch) => {
    setSavingSettings(true);
    setError('');
    try {
      const res = await base44.functions.invoke('manageUserMemory', { action: 'setSettings', settings: patch });
      setSettings(res.data.settings);
      await load();
    } catch (_) {
      setError('Could Not Save — Your Previous Setting Is Still Active.');
    }
    setSavingSettings(false);
  };

  const approve = async (m) => {
    setBusyId(m.id);
    setError('');
    try {
      const res = await base44.functions.invoke('manageUserMemory', { action: 'approve', id: m.id });
      setMemories(list => list.map(x => (x.id === m.id ? res.data.memory : x)));
    } catch (err) {
      setError(err?.response?.data?.error || 'Could Not Approve This Memory.');
    }
    setBusyId(null);
  };

  const load = async () => {
    setError('');
    try {
      const res = await base44.functions.invoke('manageUserMemory', { action: 'list' });
      setSettings(res?.data?.settings || null);
      setMemories(res?.data?.memories || []);
    } catch (_) {
      setError('Could Not Load Memories — Please Try Again.');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const startEdit = (m) => {
    setEditingId(m.id);
    setEditDraft(m.content);
  };

  const saveEdit = async () => {
    const text = editDraft.trim();
    if (!text) return;
    setBusyId(editingId);
    try {
      const res = await base44.functions.invoke('manageUserMemory', {
        action: 'update', id: editingId, content: text,
      });
      if (res?.data?.memory) {
        setMemories(list => list.map(m => (m.id === editingId ? res.data.memory : m)));
      }
      setEditingId(null);
    } catch (err) {
      setError(err?.response?.data?.error || 'Could Not Save This Memory — Please Try Again.');
    }
    setBusyId(null);
  };

  const remove = async (id) => {
    setBusyId(id);
    try {
      await base44.functions.invoke('manageUserMemory', { action: 'delete', id });
      setMemories(list => list.filter(m => m.id !== id));
    } catch (_) {
      setError('Could Not Delete This Memory — Please Try Again.');
    }
    setBusyId(null);
  };

  const clearAll = async () => {
    setClearing(true);
    try {
      await base44.functions.invoke('manageUserMemory', { action: 'clearAll' });
      setMemories([]);
    } catch (_) {
      setError('Could Not Clear Memories — Please Try Again.');
    }
    setClearing(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" /> Memory
          </span>
          <Button variant="ghost" size="sm" onClick={load} disabled={loading || clearing}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-[12px] text-muted-foreground">
          LBC AI Remembers Durable Facts, Preferences, Goals And Decisions Across Conversations — Distilled, Never Full Transcripts. Yours Only.
        </p>

        <MemoryControls settings={settings} saving={savingSettings} onUpdate={updateSettings} />

        {error && <p className="text-[12px] text-destructive">{error}</p>}

        {loading && (
          <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading Your Memories…
          </div>
        )}

        {!loading && memories.length === 0 && (
          <p className="text-[13px] text-muted-foreground">
            No Saved Memories Yet — As You Chat, Important Details Are Saved Here Automatically.
          </p>
        )}

        {!loading && memories.length > 0 && (
          <div className="space-y-2">
            {memories.map(m => (
              <div key={m.id} className="rounded-lg border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="secondary" className="shrink-0 capitalize text-[10px]">{m.category || 'fact'}</Badge>
                    {m.ineligible_reason && (
                      <Badge variant="outline" className="text-[10px]">{REVIEW_LABELS[m.ineligible_reason] || 'Not Used'}</Badge>
                    )}
                    {m.ineligible_reason === 'needs_review' && (
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]" onClick={() => approve(m)} disabled={busyId === m.id}>
                        <ShieldCheck className="h-3 w-3" /> Use This Memory
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {editingId === m.id ? (
                      <>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={saveEdit} disabled={busyId === m.id || !editDraft.trim()}>
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingId(null)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(m)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(m.id)} disabled={busyId === m.id}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                {editingId === m.id ? (
                  <Textarea
                    className="mt-2 text-[13px]"
                    rows={3}
                    value={editDraft}
                    onChange={e => setEditDraft(e.target.value)}
                    autoFocus
                  />
                ) : (
                  <p className="text-[13px] mt-2 whitespace-pre-wrap break-words">{m.content}</p>
                )}
                {(m.source_conversation_title || m.last_reinforced_at) && (
                  <p className="text-[10px] text-muted-foreground mt-1.5">
                    {m.source_conversation_title ? `From: ${m.source_conversation_title}` : ''}
                    {m.source_conversation_title && m.last_reinforced_at ? ' · ' : ''}
                    {m.last_reinforced_at ? new Date(m.last_reinforced_at).toLocaleDateString() : ''}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {!loading && memories.length > 0 && (
          <div className="pt-2 border-t border-border">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" disabled={clearing}>
                  <Trash2 className="h-3.5 w-3.5" /> Clear All Memories
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear All Memories?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This Permanently Deletes Every Memory LBC AI Has Saved About You. Ongoing Chats Are Not Affected.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={clearAll}>Clear All</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </CardContent>
    </Card>
  );
}