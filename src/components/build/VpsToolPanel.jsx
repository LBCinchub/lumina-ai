import React, { useState } from 'react';
import { Server, Terminal, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const QUICK_COMMANDS = ['uptime', 'df -h', 'free -m', 'ps aux --sort=-%cpu | head -10'];

export default function VpsToolPanel() {
  const [command, setCommand] = useState('');
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState(null);

  const runCommand = async () => {
    if (!command.trim() || running) return;
    setRunning(true);
    setOutput('');
    setStatus(null);
    try {
      const res = await base44.functions.invoke('vpsControl', { command });
      setOutput(res.data?.output || JSON.stringify(res.data, null, 2));
      setStatus('success');
    } catch (err) {
      setOutput(err.message || 'Command failed');
      setStatus('error');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-minimal p-6">
      <div className="max-w-2xl space-y-6">
        <div className="flex items-center gap-2">
          <Server className="w-5 h-5 text-foreground/60" />
          <h2 className="text-lg font-medium">VPS Tool Panel</h2>
        </div>

        <div className="flex flex-wrap gap-2">
          {QUICK_COMMANDS.map(cmd => (
            <button
              key={cmd}
              onClick={() => setCommand(cmd)}
              className="px-3 py-1.5 rounded-lg border border-border bg-card text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors font-mono"
            >
              {cmd}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={command}
            onChange={e => setCommand(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && runCommand()}
            placeholder="Enter shell command…"
            className="flex-1 px-3 py-2.5 rounded-lg border border-border bg-card text-sm font-mono focus:outline-none focus:border-foreground/30 transition-colors"
          />
          <button
            onClick={runCommand}
            disabled={!command.trim() || running}
            className="flex items-center gap-2 px-4 py-2.5 bg-foreground text-background rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-all"
          >
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Terminal className="w-4 h-4" />}
            Run
          </button>
        </div>

        {(output || running) && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-muted/40">
              <Terminal className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-mono">Output</span>
              {status === 'success' && <CheckCircle2 className="w-3.5 h-3.5 text-green-500 ml-auto" />}
              {status === 'error' && <AlertCircle className="w-3.5 h-3.5 text-destructive ml-auto" />}
            </div>
            <pre className="p-4 text-xs font-mono text-foreground/80 whitespace-pre-wrap overflow-x-auto max-h-80 scrollbar-minimal">
              {running ? 'Running…' : output}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}