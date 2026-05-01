import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Server, Terminal, RefreshCw, Loader2 } from 'lucide-react';

export default function VpsToolPanel() {
  const [logs, setLogs] = useState([]);
  const [command, setCommand] = useState('');
  const [running, setRunning] = useState(false);
  const [vpsInfo, setVpsInfo] = useState(null);

  useEffect(() => {
    base44.functions.invoke('vpsControl', { action: 'status' })
      .then(res => setVpsInfo(res.data))
      .catch(() => {});
  }, []);

  const runCommand = async () => {
    if (!command.trim() || running) return;
    setRunning(true);
    const cmd = command.trim();
    setCommand('');
    setLogs(prev => [...prev, { type: 'input', text: `$ ${cmd}` }]);
    try {
      const res = await base44.functions.invoke('vpsControl', { action: 'exec', command: cmd });
      const output = res.data?.output || res.data?.result || JSON.stringify(res.data);
      setLogs(prev => [...prev, { type: 'output', text: output }]);
    } catch (err) {
      setLogs(prev => [...prev, { type: 'error', text: err.message }]);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-green-400 font-mono text-xs">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2">
        <Server className="w-3.5 h-3.5 text-green-500" />
        <span className="text-green-500/70 uppercase tracking-widest text-[10px]">VPS Terminal</span>
        {vpsInfo?.connected && (
          <span className="ml-auto flex items-center gap-1 text-[10px] text-green-400/60">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Connected
          </span>
        )}
      </div>

      {/* Log output */}
      <div className="flex-1 overflow-y-auto scrollbar-minimal p-4 space-y-1">
        {logs.length === 0 && (
          <p className="text-slate-600">Ready. Enter a command below.</p>
        )}
        {logs.map((log, i) => (
          <div key={i} className={
            log.type === 'input' ? 'text-green-300' :
            log.type === 'error' ? 'text-red-400' :
            'text-slate-400'
          }>
            <pre className="whitespace-pre-wrap break-all">{log.text}</pre>
          </div>
        ))}
        {running && (
          <div className="flex items-center gap-2 text-slate-500">
            <Loader2 className="w-3 h-3 animate-spin" /> Running…
          </div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-slate-800 px-4 py-3 flex items-center gap-2">
        <span className="text-green-500">$</span>
        <input
          value={command}
          onChange={e => setCommand(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && runCommand()}
          placeholder="Enter command…"
          disabled={running}
          className="flex-1 bg-transparent outline-none text-green-300 placeholder:text-slate-700"
        />
        <button
          onClick={runCommand}
          disabled={!command.trim() || running}
          className="p-1.5 rounded hover:bg-slate-800 text-green-500 disabled:opacity-30 transition-colors"
        >
          <Terminal className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}