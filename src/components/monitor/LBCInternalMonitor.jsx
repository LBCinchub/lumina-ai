import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Activity, Shield, Cpu, Zap, AlertTriangle, Terminal } from 'lucide-react';

const MetricTile = ({ label, value, icon, subtext }) => (
  <div className="bg-emerald-500/[0.02] border border-emerald-500/10 rounded-xl p-4 transition-all hover:bg-emerald-500/5">
    <div className="flex items-center gap-2 text-emerald-600/70 mb-1">
      {icon}
      <span className="text-[10px] uppercase font-bold tracking-widest">{label}</span>
    </div>
    <div className="text-2xl font-bold text-emerald-50 tracking-tighter">{value}</div>
    <div className="text-[10px] text-emerald-600/50 mt-1 font-mono">{subtext}</div>
  </div>
);

export default function LBCInternalMonitor() {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchLuminaState = useCallback(async () => {
    try {
      const response = await base44.functions.invoke('luminaState', { action: 'get' });
      if (response.data?.success) {
        setState(response.data.state);
        setError(false);
      } else {
        setError(true);
      }
    } catch (err) {
      console.error('State Sync Failure:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLuminaState();
    const interval = setInterval(fetchLuminaState, 5000);
    return () => clearInterval(interval);
  }, [fetchLuminaState]);

  if (loading && !state) {
    return (
      <div className="bg-slate-900 border border-emerald-500/20 rounded-xl p-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Cpu className="w-8 h-8 text-emerald-500 animate-spin" />
          <span className="text-emerald-500 font-mono text-xs tracking-widest uppercase">Initializing_Neural_Link...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-950 border border-emerald-500/30 rounded-2xl overflow-hidden shadow-[0_0_50px_-12px_rgba(16,185,129,0.2)]">
      {/* Header */}
      <div className="bg-emerald-500/5 border-b border-emerald-500/10 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Activity className="w-5 h-5 text-emerald-400" />
            <div className="absolute inset-0 bg-emerald-400 blur-sm opacity-20 animate-pulse"></div>
          </div>
          <div>
            <h2 className="text-emerald-50 font-bold text-sm tracking-tight leading-none">LUMINA_CORE_PERSISTENCE</h2>
            <span className="text-[10px] text-emerald-500/60 font-mono uppercase">lbchub.site // instance_alpha</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`h-1.5 w-1.5 rounded-full ${error ? 'bg-red-500 animate-ping' : 'bg-emerald-500'}`} />
          <span className="text-[10px] font-mono text-emerald-500/80">{error ? 'SYNC_ERROR' : 'LINK_ACTIVE'}</span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="p-5 grid grid-cols-2 gap-4">
        <MetricTile
          label="Version"
          value={state?.version || '1.0.0'}
          icon={<Zap className="w-4 h-4" />}
          subtext="Core_Release"
        />
        <MetricTile
          label="Neural_Sync"
          value="98.4%"
          icon={<Shield className="w-4 h-4" />}
          subtext="Protocol_Standard"
        />
      </div>

      {/* Persistence Log */}
      <div className="px-5 pb-5 space-y-4">
        <div className="bg-black/40 border border-emerald-500/10 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2 text-emerald-500/50">
            <Terminal className="w-3 h-3" />
            <span className="text-[10px] font-mono uppercase tracking-widest">Active_Evolution_Goals</span>
          </div>
          <ul className="space-y-1">
            {state?.active_goals?.map((goal, i) => (
              <li key={i} className="text-xs text-emerald-200/80 font-mono flex items-center gap-2">
                <span className="text-emerald-500">&gt;</span> {goal}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2 text-red-500/50">
            <AlertTriangle className="w-3 h-3" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-red-400/60">Technical_Debt_Log</span>
          </div>
          <div className="max-h-20 overflow-y-auto space-y-1 scrollbar-minimal">
            {state?.technical_debt?.map((debt, i) => (
              <p key={i} className="text-[10px] text-red-300/60 font-mono leading-tight">{debt}</p>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="bg-emerald-500/5 p-3 flex justify-between items-center text-[9px] font-mono text-emerald-700/80">
        <span>LBC_PROTOCOL // {new Date().getFullYear()}</span>
        <div className="flex gap-4">
          <span>LBC-HUB.IO</span>
          <span>LBC-HUB.COM</span>
        </div>
      </div>
    </div>
  );
}