import React, { useState, useEffect } from 'react';
import { Activity, Shield, Cpu, Zap } from 'lucide-react';

const MetricCard = ({ label, value, icon, status }) => (
  <div className="bg-slate-950/50 p-3 rounded-lg border border-emerald-500/5 hover:border-emerald-500/20 transition-all">
    <div className="flex items-center gap-2 text-emerald-600 mb-1">
      {icon}
      <span className="text-[10px] uppercase tracking-widest">{label}</span>
    </div>
    <div className="text-xl font-bold text-emerald-50">{value}</div>
    <div className="text-[9px] text-emerald-500/50 italic mt-1 font-sans">{status}</div>
  </div>
);

export default function LBCInternalMonitor() {
  const [metrics, setMetrics] = useState({
    protocolLatency: 0,
    nodeStability: 100,
    activeIntegrations: 0,
    evolutionIndex: 85
  });
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let ws;
    try {
      ws = new WebSocket('wss://api.lbc.network/v1/telemetry');
      ws.onopen = () => setConnected(true);
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setMetrics(prev => ({ ...prev, ...data }));
        } catch (_) {}
      };
      ws.onclose = () => setConnected(false);
      ws.onerror = () => setConnected(false);
    } catch (_) {
      setConnected(false);
    }
    return () => ws?.close();
  }, []);

  return (
    <div className="bg-slate-900 border border-emerald-500/30 rounded-xl p-6 text-emerald-400 font-mono text-sm shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold tracking-tighter flex items-center gap-2">
          <Cpu className="w-5 h-5 animate-pulse" />
          LBC_PROTOCOL_CORE_TELEMETRY
        </h2>
        <span className={`px-3 py-1 rounded-full text-xs border ${connected ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-slate-700/30 border-slate-600/20 text-slate-500'}`}>
          {connected ? 'LIVE' : 'STATIC_MODE'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <MetricCard
          label="NETWORK_LATENCY"
          value={`${metrics.protocolLatency}ms`}
          icon={<Zap className="w-4 h-4" />}
          status="optimal"
        />
        <MetricCard
          label="NODE_STABILITY"
          value={`${metrics.nodeStability}%`}
          icon={<Shield className="w-4 h-4" />}
          status="secure"
        />
        <MetricCard
          label="LUMINA_EVOLUTION"
          value={`${metrics.evolutionIndex}.4`}
          icon={<Activity className="w-4 h-4" />}
          status="ascending"
        />
        <MetricCard
          label="ACTIVE_NODES"
          value={metrics.activeIntegrations.toString()}
          icon={<Cpu className="w-4 h-4" />}
          status="active"
        />
      </div>

      <div className="mt-6 p-4 bg-black/40 rounded-lg border border-emerald-500/10">
        <div className="flex justify-between text-[10px] mb-2 text-emerald-600">
          <span>SELF_REFACTOR_STREAM</span>
          <span>COMPLETED: 94%</span>
        </div>
        <div className="w-full bg-emerald-950 h-1 rounded-full overflow-hidden">
          <div className="bg-emerald-500 h-full w-[94%] shadow-[0_0_8px_#10b981]" />
        </div>
      </div>
    </div>
  );
}