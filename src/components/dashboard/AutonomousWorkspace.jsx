import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Bot, Terminal, CheckCircle2, XCircle, Loader2, Cpu } from 'lucide-react';

const TASK_TYPES = ['security_patch', 'latency_opt', 'sync_repair', 'content_gen'];

const statusStyle = {
  completed: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', icon: CheckCircle2, iconBg: 'bg-emerald-500/10 text-emerald-500', bar: 'bg-emerald-500' },
  running:   { bg: 'bg-blue-500/20',    text: 'text-blue-400',    icon: Loader2,      iconBg: 'bg-blue-500/10 text-blue-400',    bar: 'bg-blue-500' },
  failed:    { bg: 'bg-red-500/20',     text: 'text-red-400',     icon: XCircle,      iconBg: 'bg-red-500/10 text-red-400',      bar: 'bg-red-500' },
  queued:    { bg: 'bg-white/10',       text: 'text-white/40',    icon: Cpu,          iconBg: 'bg-white/5 text-white/30',        bar: 'bg-white/20' },
};

function TaskCard({ task }) {
  const s = statusStyle[task.status] || statusStyle.queued;
  const Icon = s.icon;
  return (
    <div className="bg-black/40 border border-white/[0.03] rounded-2xl p-5 hover:border-emerald-500/20 transition-all">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${s.iconBg}`}>
            <Icon size={16} className={task.status === 'running' ? 'animate-spin' : ''} />
          </div>
          <div>
            <h4 className="text-xs font-mono font-bold uppercase tracking-tighter text-white/90">{task.id}</h4>
            <p className="text-[10px] text-white/30 uppercase font-mono">{task.type.replace(/_/g, ' ')}</p>
          </div>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${s.bg} ${s.text}`}>
          {task.status.toUpperCase()}
        </span>
      </div>

      <div className="space-y-1 mb-4">
        <div className="flex justify-between text-[9px] font-mono text-white/20">
          <span>Task_Progress</span>
          <span>{task.progress}%</span>
        </div>
        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ${s.bar} shadow-[0_0_8px_rgba(16,185,129,0.4)]`}
            style={{ width: `${task.progress}%` }}
          />
        </div>
      </div>

      <div className="bg-black/60 rounded-xl p-3 border border-white/[0.02]">
        <div className="flex items-center gap-2 mb-2 text-white/20">
          <Terminal size={10} />
          <span className="text-[9px] font-mono uppercase tracking-widest">Real_Time_Log</span>
        </div>
        <div className="space-y-1">
          {(task.logs || []).slice(-2).map((log, i) => (
            <p key={i} className="text-[10px] font-mono text-emerald-500/60 truncate">
              <span className="text-emerald-900 mr-2">»</span>{log}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AutonomousWorkspace() {
  const [tasks, setTasks] = useState([]);
  const [spawning, setSpawning] = useState(false);

  const fetchTasks = async () => {
    try {
      const res = await base44.functions.invoke('agentOrchestrator', { action: 'list' });
      if (res.data?.tasks) setTasks(res.data.tasks);
    } catch (_) {}
  };

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 3000);
    return () => clearInterval(interval);
  }, []);

  const spawnTask = async () => {
    setSpawning(true);
    const type = TASK_TYPES[Math.floor(Math.random() * TASK_TYPES.length)];
    try {
      await base44.functions.invoke('agentOrchestrator', { action: 'spawn', type });
      await fetchTasks();
    } catch (_) {}
    setSpawning(false);
  };

  const running = tasks.filter(t => t.status === 'running').length;

  return (
    <div className="bg-slate-900 border border-emerald-500/20 rounded-[2rem] overflow-hidden flex flex-col h-[500px]">
      <div className="p-6 bg-emerald-500/5 border-b border-emerald-500/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bot className="text-emerald-400 w-5 h-5" />
          <h3 className="font-bold text-sm tracking-tight">Autonomous_Agent_Runner</h3>
        </div>
        <div className="px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
          <span className="text-[10px] font-mono text-emerald-500 font-bold uppercase tracking-widest">
            Active_Threads: {running}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-minimal p-6 space-y-4">
        {tasks.length === 0 ? (
          <div className="flex items-center justify-center h-full text-white/20 text-xs font-mono">
            NO_ACTIVE_AGENTS — Spawn a thread below.
          </div>
        ) : (
          tasks.map(task => <TaskCard key={task.id} task={task} />)
        )}
      </div>

      <div className="p-4 bg-emerald-500/5 border-t border-emerald-500/10 text-center">
        <button
          onClick={spawnTask}
          disabled={spawning}
          className="text-[10px] font-mono text-emerald-500/60 hover:text-emerald-400 transition-colors flex items-center justify-center gap-2 mx-auto disabled:opacity-40"
        >
          <Cpu size={12} />
          {spawning ? 'INITIALIZING...' : 'INITIALIZE_NEW_SUB_AGENT_THREAD'}
        </button>
      </div>
    </div>
  );
}