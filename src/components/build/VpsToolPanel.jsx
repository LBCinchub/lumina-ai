import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Server, ArrowUp, Terminal, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const QUICK_COMMANDS = [
  'Check server status',
  'Get server info and specs',
  'Reboot the server',
  'Shutdown the server',
  'Boot the server',
];

function LogEntry({ entry }) {
  const isUser = entry.role === 'user';
  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] bg-accent text-accent-foreground rounded-xl rounded-tr-sm px-3 py-2 text-sm">
          {entry.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2.5">
      <div className="shrink-0 w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center mt-0.5">
        <Terminal className="w-3.5 h-3.5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground/90 leading-relaxed">{entry.message}</p>
        {entry.action && (
          <div className="mt-1.5 flex items-center gap-1.5">
            {entry.success ? (
              <CheckCircle className="w-3 h-3 text-green-500 shrink-0" />
            ) : (
              <AlertCircle className="w-3 h-3 text-amber-500 shrink-0" />
            )}
            <span className="text-[11px] text-muted-foreground font-mono">
              action: {entry.action}
            </span>
          </div>
        )}
        {entry.result && Object.keys(entry.result).length > 0 && (
          <pre className="mt-2 text-[11px] bg-muted rounded-lg p-2.5 overflow-x-auto text-foreground/70 leading-relaxed">
            {JSON.stringify(entry.result, null, 2)}
          </pre>
        )}
        {entry.error && (
          <p className="mt-1 text-xs text-destructive">{entry.error}</p>
        )}
      </div>
    </div>
  );
}

export default function VpsToolPanel() {
  const [log, setLog] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [log, loading]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, [input]);

  const send = async (text) => {
    const cmd = (text ?? input).trim();
    if (!cmd || loading) return;

    setLog(prev => [...prev, { role: 'user', content: cmd }]);
    setInput('');
    setLoading(true);

    try {
      const res = await base44.functions.invoke('luminaVpsTool', { command: cmd });
      const data = res.data;

      if (data.error) {
        setLog(prev => [...prev, { role: 'lumina', message: data.error, error: true, success: false }]);
      } else {
        setLog(prev => [...prev, {
          role: 'lumina',
          message: data.message,
          action: data.action,
          result: data.result,
          success: data.success
        }]);
      }
    } catch (err) {
      setLog(prev => [...prev, { role: 'lumina', message: 'Failed to reach VPS tool.', error: err.message, success: false }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 px-4 py-3 border-b border-border/60 flex items-center gap-2">
        <Server className="w-4 h-4 text-foreground/60" strokeWidth={1.75} />
        <span className="text-sm font-medium">VPS Control</span>
        <span className="text-xs text-muted-foreground ml-1">server1.lbc.network</span>
        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" title="Connected" />
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-minimal px-4 py-4 space-y-4">
        {log.length === 0 && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground/70 uppercase tracking-[0.14em]">Quick commands</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_COMMANDS.map(cmd => (
                <button
                  key={cmd}
                  onClick={() => send(cmd)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-accent hover:border-foreground/20 transition-colors text-foreground/70 hover:text-foreground"
                >
                  {cmd}
                </button>
              ))}
            </div>
          </div>
        )}
        {log.map((entry, i) => (
          <LogEntry key={i} entry={entry} />
        ))}
        {loading && (
          <div className="flex gap-2.5 items-center text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            Lumina is executing…
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-border/60 p-3">
        <div className={cn(
          "flex items-end gap-2 bg-card border border-border rounded-xl px-3 py-2",
          "focus-within:border-foreground/30 transition-all"
        )}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. Reboot the server, check status…"
            rows={1}
            disabled={loading}
            className="flex-1 bg-transparent resize-none outline-none text-sm leading-relaxed placeholder:text-muted-foreground/60 scrollbar-minimal"
            style={{ maxHeight: '120px' }}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className={cn(
              "shrink-0 w-7 h-7 rounded-full flex items-center justify-center",
              "bg-foreground text-background transition-all",
              "hover:scale-105 disabled:opacity-30 disabled:hover:scale-100 disabled:cursor-not-allowed"
            )}
          >
            <ArrowUp className="w-3.5 h-3.5" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}