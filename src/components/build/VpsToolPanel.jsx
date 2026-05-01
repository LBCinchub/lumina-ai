import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Server, Terminal, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const COMMANDS = [
  { label: 'Status', cmd: 'status' },
  { label: 'Restart', cmd: 'restart' },
  { label: 'Logs', cmd: 'logs' },
  { label: 'Deploy', cmd: 'deploy' },
];

export default function VpsToolPanel() {
  const [output, setOutput] = useState([]);
  const [running, setRunning] = useState(false);

  const run = async (cmd) => {
    if (running) return;
    setRunning(true);
    setOutput(prev => [...prev, { type: 'cmd', text: `$ ${cmd}` }]);
    try {
      const res = await base44.functions.invoke('vpsControl', { command: cmd });
      const text = res?.data?.output || res?.data?.message || JSON.stringify(res?.data || {});
      setOutput(prev => [...prev, { type: 'ok', text }]);
    } catch (err) {
      setOutput(prev => [...prev, { type: 'err', text: err.message || 'Command failed' }]);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0d0d0d] text-[#cdd6f4] font-mono text-[13px]">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-[#181825] shrink-0">
        <Server className="w-4 h-4 text-white/40" strokeWidth={1.5} />
        <span className="text-xs text-white/40 uppercase tracking-[0.12em]">VPS Control Panel</span>
      </div>

      <div className="flex gap-2 px-4 py-3 border-b border-white/10 shrink-0 flex-wrap">
        {COMMANDS.map(({ label, cmd }) => (
          <button
            key={cmd}
            onClick={() => run(cmd)}
            disabled={running}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs border transition-all",
              "border-white/10 text-white/60 hover:text-white hover:border-white/30",
              "disabled:opacity-40 disabled:cursor-not-allowed"
            )}
          >
            {label}
          </button>
        ))}
        {running && <Loader2 className="w-4 h-4 animate-spin text-white/30 self-center ml-1" />}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-minimal px-4 py-3 space-y-1">
        {output.length === 0 && (
          <div className="flex items-center gap-2 text-white/20 mt-4">
            <Terminal className="w-4 h-4" />
            <span>Select a command to run…</span>
          </div>
        )}
        {output.map((line, i) => (
          <div key={i} className={cn(
            "flex items-start gap-2",
            line.type === 'cmd' && "text-[#cba6f7]",
            line.type === 'ok' && "text-[#a6e3a1]",
            line.type === 'err' && "text-[#f38ba8]"
          )}>
            {line.type === 'ok' && <CheckCircle className="w-3 h-3 mt-0.5 shrink-0" />}
            {line.type === 'err' && <XCircle className="w-3 h-3 mt-0.5 shrink-0" />}
            <pre className="whitespace-pre-wrap break-all text-[12px] leading-relaxed">{line.text}</pre>
          </div>
        ))}
      </div>
    </div>
  );
}