import React from 'react';
import LBCInternalMonitor from '@/components/monitor/LBCInternalMonitor';
import SecurityShield from '@/components/security/SecurityShield';
import DeploymentTerminal from '@/components/dashboard/DeploymentTerminal';
import { Activity, LayoutGrid, Zap, Globe } from 'lucide-react';

const LOG_ENTRIES = [
  { time: "23:10:12", msg: "ProtocolGuard successfully initialized.", type: "success" },
  { time: "23:09:55", msg: "MasterDashboard route carved by Base44 agent.", type: "info" },
  { time: "23:08:21", msg: "SisterSync handshake: lbc-hub.com acknowledged.", type: "success" },
  { time: "23:04:15", msg: "InsightEngine detected technical debt in VpsToolPanel.", type: "warning" },
];

const LogEntry = ({ time, msg, type }) => (
  <div className="flex gap-4 border-b border-white/[0.02] py-2">
    <span className="text-white/10 shrink-0">{time}</span>
    <span className={
      type === 'success' ? 'text-emerald-500' :
      type === 'warning' ? 'text-amber-500' :
      'text-blue-400'
    }>[{type.toUpperCase()}]</span>
    <span className="text-white/40">{msg}</span>
  </div>
);

export default function Dashboard() {
  return (
    <div className="p-6 bg-slate-950 min-h-screen text-emerald-50 font-sans">
      <div className="max-w-[1600px] mx-auto">

        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <LayoutGrid className="w-4 h-4 text-emerald-500" />
              <span className="text-emerald-500/60 font-mono text-[10px] tracking-widest uppercase">Ecosystem_Command</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight">LBC Operations</h1>
          </div>

          <div className="flex gap-4">
            <div className="bg-emerald-500/5 border border-emerald-500/10 px-4 py-2 rounded-xl flex items-center gap-3">
              <Globe className="w-4 h-4 text-emerald-500" />
              <div className="text-left">
                <p className="text-[8px] font-mono text-emerald-700 uppercase leading-none mb-1">Network_Reach</p>
                <p className="text-xs font-bold leading-none">Global_Stable</p>
              </div>
            </div>
            <div className="bg-blue-500/5 border border-blue-500/10 px-4 py-2 rounded-xl flex items-center gap-3">
              <Zap className="w-4 h-4 text-blue-400" />
              <div className="text-left">
                <p className="text-[8px] font-mono text-blue-700 uppercase leading-none mb-1">Sister_Latency</p>
                <p className="text-xs font-bold leading-none">12ms</p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left: Telemetry & Security */}
          <div className="lg:col-span-4 space-y-6">
            <LBCInternalMonitor />
            <SecurityShield />

            <div className="bg-slate-900 border border-emerald-500/10 p-6 rounded-3xl">
              <h4 className="text-[10px] font-mono font-bold text-emerald-500/40 uppercase tracking-widest mb-4">Node_Uptime_History</h4>
              <div className="h-32 flex items-end gap-1">
                {[88,95,72,100,98,85,90,77,100,93,88,76,100,99,82,91,95,88,100,97,84,90,94,100].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-emerald-500/20 rounded-t-sm hover:bg-emerald-500 transition-all"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
              <div className="flex justify-between mt-2 text-[8px] font-mono text-emerald-900">
                <span>24H_AGO</span>
                <span>REAL_TIME</span>
              </div>
            </div>
          </div>

          {/* Right: Insights & Logs */}
          <div className="lg:col-span-8 flex flex-col gap-6">

            {/* Placeholder for FuturePulse content */}
            <div className="flex-1 bg-slate-900 border border-emerald-500/10 rounded-3xl p-6">
              <h3 className="text-[10px] font-mono font-bold text-emerald-500/40 uppercase tracking-widest mb-4">Strategic_Roadmap</h3>
              <p className="text-emerald-100/20 text-sm">Visit <a href="/pulse" className="text-emerald-500 underline">/pulse</a> for the full FuturePulse dashboard.</p>
            </div>

            {/* Deployment Terminal */}
            <DeploymentTerminal />

            {/* System Logs */}
            <div className="bg-black/40 border border-white/[0.03] rounded-3xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-mono font-bold text-white/30 uppercase tracking-widest flex items-center gap-2">
                  <Activity className="w-3 h-3" /> System_Logs
                </h3>
                <span className="text-[10px] text-emerald-500 font-mono">LIVE_FEED</span>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-minimal font-mono text-[11px]">
                {LOG_ENTRIES.map((entry, i) => (
                  <LogEntry key={i} {...entry} />
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}