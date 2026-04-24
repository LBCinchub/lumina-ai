import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Cpu, Terminal, Zap, CheckCircle2, Loader2, Play } from 'lucide-react';

const PRESET_TASKS = ['latency_optimization', 'security_patch', 'sync_repair', 'content_gen'];

export default function AutonomousWorkspace() {
  const [threads, setThreads] = useState([]);
  const [spawning, setSpawning] = useState(false);

  const fetchThreads = async () => {
    try {
      const res = await base44.functions.invoke('agentOrchestrator', { action: 'list' });
      if (res.data?.threads) setThreads(res.data.threads);
    } catch (_) {}
  };

  useEffect(() => {
    fetchThreads();
    const interval = setInterval(fetchThreads, 2000);
    return () => clearInterval(interval);
  }, []);

  const spawnThread = async () => {
    setSpawning(true);
    const task = PRESET_TASKS[Math.floor(Math.random() * PRESET_TASKS.length)];
    try {
      await base44.functions.invoke('agentOrchestrator', { action: 'spawn', task });
      await fetchThreads();
    } catch (_) {}
    setSpawning(false);
  };

  return (
    <div className="bg-slate-900/50 border border-emerald-500/10 rounded-[2rem] p-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 rounded-2xl">
            <Cpu className="text-emerald-500 animate-pulse" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold">Autonomous_Threads</h2>
            <p className="text-[10px] font-mono text-emerald-500/40 uppercase tracking-widest">
              Active_Sub_Processes: {threads.filter(t => t.status === 'active').length}
            </p>
          </div>
        </div>
        <button
          onClick={spawnThread}
          disabled={spawning}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-500 text-xs font-mono hover:bg-emerald-500/20 transition-all disabled:opacity-40"
        >
          <Play size={12} /> {spawning ? 'SPAWNING...' : 'SPAWN_NEW_THREAD'}
        </button>
      </div>

      <div className="space-y-4">
        {threads.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-white/5 rounded-2xl">
            <span className="text-xs text-white/10 font-mono italic">Waiting for autonomous task triggers...</span>
          </div>
        ) : (
          threads.map(thread => (
            <div key={thread.id} className="bg-black/40 border border-white/[0.03] p-5 rounded-2xl hover:border-emerald-500/20 transition-all">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  <Terminal size={14} className="text-emerald-500/40" />
                  <span className="text-sm font-medium text-emerald-50/80">{thread.task}</span>
                  <span className="text-[9px] font-mono text-white/20">ID: {thread.id}</span>
                </div>
                {thread.status === 'completed'
                  ? <CheckCircle2 size={16} className="text-emerald-500" />
                  : <Loader2 size={16} className="text-emerald-500 animate-spin" />
                }
              </div>
              <div className="w-full bg-emerald-950 h-1 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full transition-all duration-500"
                  style={{ width: `${thread.progress}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-8 flex items-center gap-3 p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
        <Zap className="text-emerald-500/40 w-4 h-4 shrink-0" />
        <p className="text-[10px] text-emerald-200/40 leading-relaxed font-mono">
          PROACTIVE_MODE_ACTIVE: Lumina is monitoring Protocol Guard and Sister Hub synchronization in background cycles.
        </p>
      </div>
    </div>
  );
}