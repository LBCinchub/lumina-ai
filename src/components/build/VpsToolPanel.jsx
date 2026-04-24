import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Server, Terminal, Play, Loader2 } from 'lucide-react';

const COMMANDS = ['status', 'restart', 'logs', 'deploy'];

export default function VpsToolPanel() {
  const [command, setCommand] = useState('status');
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    setOutput('');
    try {
      const res = await base44.functions.invoke('vpsControl', { command });
      setOutput(typeof res.data === 'string' ? res.data : JSON.stringify(res.data, null, 2));
    } catch (err) {
      setOutput(`Error: ${err.message}`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-minimal p-6">
      <div className="max-w-lg space-y-5">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-foreground/60" />
          <h2 className="text-sm font-medium">VPS Control</h2>
        </div>

        <div className="flex gap-2 flex-wrap">
          {COMMANDS.map(cmd => (
            <button
              key={cmd}
              onClick={() => setCommand(cmd)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors ${
                command === cmd
                  ? 'bg-foreground text-background border-foreground'
                  : 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground'
              }`}
            >
              {cmd}
            </button>
          ))}
        </div>

        <button
          onClick={run}
          disabled={running}
          className="flex items-center gap-2 px-4 py-2 bg-foreground text-background rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          {running ? 'Running…' : 'Execute'}
        </button>

        {output && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/40">
              <Terminal className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-mono">output</span>
            </div>
            <pre className="p-4 text-xs font-mono text-foreground/85 whitespace-pre-wrap overflow-x-auto max-h-80 scrollbar-minimal">
              {output}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}