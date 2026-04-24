import React, { useState, useEffect } from 'react';
import { Activity, Shield, Cpu, Zap, AlertCircle } from 'lucide-react';

const MetricCard = ({ label, value, icon }) => (
  <div className="bg-slate-950/50 p-3 rounded-lg border border-emerald-500/5">
    <div className="flex items-center gap-2 text-emerald-600 mb-1">
      {icon}
      <span className="text-[10px] uppercase tracking-widest">{label}</span>
    </div>
    <div className="text-xl font-bold text-emerald-50">{value}</div>
  </div>
);

export default function LBCInternalMonitor() {
  const [metrics, setMetrics] = useState({
    protocolLatency: 0,
    nodeStability: 0,
    activeIntegrations: 0,
    evolutionIndex: 0
  });
  const [status, setStatus] = useState('CONNECTING');

  useEffect(() => {
    const socketUrl = import.meta.env.DEV
      ? 'ws://localhost:8080'
      : 'wss://api.lbc.network/v1/telemetry';

    let ws;
    try {
      ws = new WebSocket(socketUrl);
      ws.onopen = () => setStatus('OPTIMAL');
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setMetrics(data);
        } catch (_) {}
      };
      ws.onerror = () => setStatus('DISCONNECTED');
      ws.onclose = () => {
        if (status !== 'DISCONNECTED') setStatus('DISCONNECTED');
      };
    } catch (_) {
      setStatus('DISCONNECTED');
    }

    return () => ws?.close();
  }, []);

  return (
    <div className="bg-slate-900 border border-emerald-500/30 rounded-xl p-6 text-emerald-400 font-mono text-sm shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold tracking-tighter flex items-center gap-2">
          <Cpu className={`w-5 h-5 ${status === 'OPTIMAL' ? 'animate-pulse' : ''}`} />
          LBC_PROTOCOL_CORE
        </h2>
        <span className={`px-3 py-1 rounded-full text-xs border ${
          status === 'OPTIMAL'
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            : status === 'CONNECTING'
            ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
            : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          {status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <MetricCard label="LATENCY" value={`${metrics.protocolLatency}ms`} icon={<Zap className="w-4 h-4" />} />
        <MetricCard label="STABILITY" value={`${metrics.nodeStability.toFixed(1)}%`} icon={<Shield className="w-4 h-4" />} />
        <MetricCard label="EVOLUTION" value={metrics.evolutionIndex.toFixed(2)} icon={<Activity className="w-4 h-4" />} />
        <MetricCard label="NODES" value={metrics.activeIntegrations.toString()} icon={<Cpu className="w-4 h-4" />} />
      </div>

      {status === 'DISCONNECTED' && (
        <div className="mt-4 flex items-center gap-2 text-red-400 text-[10px]">
          <AlertCircle className="w-3 h-3 shrink-0" />
          BACKEND_OFFLINE: NO TELEMETRY SOURCE AVAILABLE
        </div>
      )}
    </div>
  );
}