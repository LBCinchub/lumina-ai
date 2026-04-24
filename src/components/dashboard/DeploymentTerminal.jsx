import React, { useState, useEffect } from 'react';
import { Terminal, CloudLightning } from 'lucide-react';

export default function DeploymentTerminal() {
  const [logs, setLogs] = useState([]);
  const [isDeploying, setIsDeploying] = useState(false);
  const [progress, setProgress] = useState(0);

  const addLog = (msg) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const startDeploy = () => {
    setIsDeploying(true);
    setProgress(0);
    setLogs([]);
    setTimeout(() => addLog("Initializing_Deployment_Forge..."), 0);
    setTimeout(() => addLog("Bundling_Protocol_Assets..."), 200);
    setTimeout(() => addLog("Generating_Security_Signature..."), 400);
  };

  useEffect(() => {
    if (!isDeploying || progress >= 100) {
      if (progress === 100) {
        addLog("DEPLOYMENT_SUCCESSFUL: Hub_is_Live.");
        setIsDeploying(false);
      }
      return;
    }
    const timer = setTimeout(() => {
      setProgress(p => {
        const next = p + 10;
        if (next === 40) addLog("Handshaking_with_Mother_Node...");
        if (next === 70) addLog("Synchronizing_Global_States...");
        if (next === 90) addLog("Finalizing_Handover...");
        return next;
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [isDeploying, progress]);

  return (
    <div className="bg-black border border-emerald-500/20 rounded-3xl overflow-hidden flex flex-col h-[400px] shadow-2xl">
      {/* Header */}
      <div className="bg-white/5 px-6 py-3 border-b border-white/5 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Terminal size={14} className="text-emerald-500" />
          <span className="text-[10px] font-mono font-bold tracking-widest text-emerald-500/60 uppercase">Deploy_Terminal_v2.0</span>
        </div>
        <div className="flex gap-1.5">
          <div className="w-2 h-2 rounded-full bg-red-500/20" />
          <div className="w-2 h-2 rounded-full bg-amber-500/20" />
          <div className="w-2 h-2 rounded-full bg-emerald-500/20" />
        </div>
      </div>

      {/* Log output */}
      <div className="flex-1 p-6 font-mono text-[11px] space-y-1 overflow-y-auto scrollbar-minimal">
        {logs.map((log, i) => (
          <div key={i} className="flex gap-4">
            <span className="text-emerald-900 shrink-0">{i + 1}</span>
            <span className={log.includes('SUCCESSFUL') ? 'text-emerald-400 font-bold' : 'text-emerald-500/70'}>
              {log}
            </span>
          </div>
        ))}
        {isDeploying && <div className="w-2 h-4 bg-emerald-500 animate-pulse inline-block" />}
      </div>

      {/* Footer */}
      <div className="p-6 bg-white/[0.02] border-t border-white/5 flex items-center gap-6">
        {!isDeploying && progress === 0 ? (
          <button
            onClick={startDeploy}
            className="flex items-center gap-3 px-6 py-3 bg-emerald-500 text-black font-black rounded-xl hover:bg-emerald-400 transition-all text-xs"
          >
            <CloudLightning size={16} /> SHIP_TO_NETWORK
          </button>
        ) : (
          <div className="flex-1 space-y-3">
            <div className="flex justify-between items-end">
              <span className="text-[10px] font-mono text-emerald-500/60 uppercase tracking-widest">
                {progress < 100 ? 'Uploading_Artifacts...' : 'Deployment_Complete'}
              </span>
              <span className="text-sm font-bold text-emerald-50">{progress}%</span>
            </div>
            <div className="h-1.5 w-full bg-emerald-950 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300 shadow-[0_0_12px_#10b981]"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}