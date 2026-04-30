import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { BookOpen, Plus, Link, FileText, AlignLeft, Trash2, RefreshCw, CheckCircle2, AlertCircle, Clock, ToggleLeft, ToggleRight, X, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

const TYPE_CONFIG = {
  file: { label: 'File Upload', icon: FileText, accept: '.pdf,.txt,.md,.doc,.docx' },
  url: { label: 'Web URL', icon: Link, placeholder: 'https://example.com/article' },
  text: { label: 'Paste Text', icon: AlignLeft, placeholder: 'Paste your content here…' }
};

function StatusBadge({ status }) {
  if (status === 'ready') return (
    <span className="flex items-center gap-1 text-[10px] text-green-600 dark:text-green-400 font-mono uppercase tracking-wide">
      <CheckCircle2 className="w-3 h-3" /> Ready
    </span>
  );
  if (status === 'error') return (
    <span className="flex items-center gap-1 text-[10px] text-destructive font-mono uppercase tracking-wide">
      <AlertCircle className="w-3 h-3" /> Error
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono uppercase tracking-wide">
      <Clock className="w-3 h-3 animate-pulse" /> Processing
    </span>
  );
}

function AddSourceModal({ onClose, onAdded }) {
  const [type, setType] = useState('file');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef();

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''));
  };

  const handleSubmit = async () => {
    setError('');
    if (!title.trim()) { setError('Please enter a title.'); return; }
    if (type === 'file' && !file) { setError('Please select a file.'); return; }
    if (type === 'url' && !url.trim()) { setError('Please enter a URL.'); return; }
    if (type === 'text' && !text.trim()) { setError('Please paste some text.'); return; }

    setUploading(true);
    try {
      let sourceData = { title: title.trim(), source_type: type, status: 'processing', is_active: true };

      if (type === 'file') {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        sourceData.file_url = file_url;
        sourceData.file_size = file.size;
      } else if (type === 'url') {
        sourceData.url = url.trim();
      } else {
        sourceData.raw_text = text;
      }

      const source = await base44.entities.KnowledgeSource.create(sourceData);

      // Trigger ingestion
      base44.functions.invoke('ingestKnowledgeSource', { source_id: source.id }).catch(() => {});

      onAdded(source);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to add source.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-fade-up">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-serif text-lg">Add Knowledge Source</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Type selector */}
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => setType(key)}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs transition-all",
                  type === key
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                )}
              >
                <cfg.icon className="w-4 h-4" />
                {cfg.label}
              </button>
            ))}
          </div>

          {/* Title */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Title</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Give this source a name"
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-foreground/40 transition-colors"
            />
          </div>

          {/* Type-specific input */}
          {type === 'file' && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">File (PDF, TXT, MD, DOC)</label>
              <div
                onClick={() => fileRef.current?.click()}
                className={cn(
                  "w-full flex flex-col items-center gap-2 py-6 rounded-lg border-2 border-dashed cursor-pointer transition-colors",
                  file ? "border-foreground/40 bg-accent/30" : "border-border hover:border-foreground/30"
                )}
              >
                <Upload className="w-5 h-5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {file ? file.name : 'Click to select file'}
                </span>
                <input ref={fileRef} type="file" accept={TYPE_CONFIG.file.accept} onChange={handleFileChange} className="hidden" />
              </div>
            </div>
          )}

          {type === 'url' && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">URL</label>
              <input
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder={TYPE_CONFIG.url.placeholder}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm font-mono focus:outline-none focus:border-foreground/40 transition-colors"
              />
            </div>
          )}

          {type === 'text' && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Content</label>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder={TYPE_CONFIG.text.placeholder}
                rows={6}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm resize-none focus:outline-none focus:border-foreground/40 transition-colors"
              />
            </div>
          )}

          {error && <p className="text-xs text-destructive">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-foreground text-background rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-all"
          >
            {uploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {uploading ? 'Adding…' : 'Add Source'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SourceCard({ source, onDelete, onToggle, onRetry }) {
  const Icon = TYPE_CONFIG[source.source_type]?.icon || FileText;
  return (
    <div className={cn(
      "group flex items-start gap-4 p-4 rounded-xl border transition-all",
      source.is_active ? "border-border bg-card" : "border-border/50 bg-muted/30 opacity-60"
    )}>
      <div className="shrink-0 mt-0.5 w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{source.title}</p>
            <p className="text-[11px] text-muted-foreground capitalize mt-0.5">{source.source_type}{source.url ? ` · ${source.url.slice(0, 40)}…` : ''}</p>
          </div>
          <StatusBadge status={source.status} />
        </div>
        {source.status === 'error' && source.error_message && (
          <p className="text-[11px] text-destructive mt-1">{source.error_message}</p>
        )}
        {source.content && (
          <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{source.content.slice(0, 120)}…</p>
        )}
      </div>
      <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {source.status === 'error' && (
          <button onClick={() => onRetry(source)} className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" title="Retry">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}
        <button onClick={() => onToggle(source)} className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" title={source.is_active ? 'Disable' : 'Enable'}>
          {source.is_active ? <ToggleRight className="w-4 h-4 text-foreground" /> : <ToggleLeft className="w-4 h-4" />}
        </button>
        <button onClick={() => onDelete(source.id)} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="Delete">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function KnowledgeSources() {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.KnowledgeSource.list('-created_date', 100);
    setSources(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Poll for processing sources
  useEffect(() => {
    const processing = sources.filter(s => s.status === 'processing');
    if (!processing.length) return;
    const timer = setTimeout(load, 3000);
    return () => clearTimeout(timer);
  }, [sources]);

  const handleAdded = (source) => {
    setSources(prev => [source, ...prev]);
    // Reload after a few seconds to get the processed status
    setTimeout(load, 4000);
  };

  const handleDelete = async (id) => {
    await base44.entities.KnowledgeSource.delete(id);
    setSources(prev => prev.filter(s => s.id !== id));
  };

  const handleToggle = async (source) => {
    const updated = await base44.entities.KnowledgeSource.update(source.id, { is_active: !source.is_active });
    setSources(prev => prev.map(s => s.id === source.id ? { ...s, is_active: !s.is_active } : s));
  };

  const handleRetry = async (source) => {
    await base44.entities.KnowledgeSource.update(source.id, { status: 'processing', error_message: null });
    setSources(prev => prev.map(s => s.id === source.id ? { ...s, status: 'processing', error_message: null } : s));
    base44.functions.invoke('ingestKnowledgeSource', { source_id: source.id }).catch(() => {});
    setTimeout(load, 5000);
  };

  const ready = sources.filter(s => s.status === 'ready' && s.is_active).length;
  const total = sources.length;

  return (
    <>
      {showAdd && <AddSourceModal onClose={() => setShowAdd(false)} onAdded={handleAdded} />}
      <div className="flex-1 overflow-y-auto scrollbar-minimal">
        <div className="max-w-2xl mx-auto px-5 md:px-8 py-8 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <BookOpen className="w-5 h-5 text-foreground/60" strokeWidth={1.5} />
                <h1 className="font-serif text-2xl tracking-tight">Knowledge Sources</h1>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Luna uses these as a primary retrieval layer — she reads them before answering to ground her reasoning in your material.
              </p>
            </div>
            <button
              onClick={() => setShowAdd(true)}
              className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-foreground text-background rounded-lg text-sm font-medium hover:opacity-90 transition-all"
            >
              <Plus className="w-4 h-4" /> Add Source
            </button>
          </div>

          {/* Stats bar */}
          {total > 0 && (
            <div className="flex items-center gap-4 px-4 py-3 rounded-xl bg-accent/40 border border-border text-xs text-muted-foreground">
              <span><strong className="text-foreground">{ready}</strong> active source{ready !== 1 ? 's' : ''} in Luna's context</span>
              <span className="text-border">·</span>
              <span>{total} total</span>
            </div>
          )}

          {/* Sources list */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="w-5 h-5 text-muted-foreground animate-spin" />
            </div>
          ) : sources.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <BookOpen className="w-10 h-10 text-muted-foreground/30 mb-4" strokeWidth={1} />
              <p className="text-sm font-medium mb-1">No knowledge sources yet</p>
              <p className="text-xs text-muted-foreground mb-6 max-w-xs leading-relaxed">
                Upload PDFs, link articles, or paste text — Luna will use them as reference material in every conversation.
              </p>
              <button
                onClick={() => setShowAdd(true)}
                className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg text-sm text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
              >
                <Plus className="w-4 h-4" /> Add your first source
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {sources.map(s => (
                <SourceCard
                  key={s.id}
                  source={s}
                  onDelete={handleDelete}
                  onToggle={handleToggle}
                  onRetry={handleRetry}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}