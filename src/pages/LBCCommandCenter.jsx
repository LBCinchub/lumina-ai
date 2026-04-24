import React, { useState } from 'react';
import { Activity, Shield, Zap, Layout, Server, Globe } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const NodeStatus = ({ name, status, latency }) => (
  <div className="flex items-center justify-between p-4 bg-slate-900/50 border border-slate-800 rounded-lg">
    <div className="flex items-center gap-3">
      <div className={`w-2 h-2 rounded-full ${status === 'online' ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-amber-400'}`} />
      <span className="text-sm font-medium text-slate-200">{name}</span>
    </div>
    <span className="text-xs font-mono text-slate-500">{latency}</span>
  </div>
);

export default function LBCCommandCenter() {
  const [user, setUser] = useState(null);
  const [uptime] = useState('99.99%');

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 p-8 font-sans">
      <header className="flex justify-between items-start mb-12">
        <div>
          <h1 className="text-3xl font-light tracking-tight text-white mb-2">
            Welcome back, <span className="font-semibold text-indigo-400">{user?.full_name || 'Architect'}</span>
          </h1>
          <p className="text-slate-500 max-w-md">
            LBC Protocol is operating at nominal parameters. All family nodes are synchronized.
          </p>
        </div>
        <div className="flex gap-4">
          <div className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-xs font-bold tracking-widest uppercase">
            Protocol v4.0.2-Stable
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-2xl">
              <Zap className="w-5 h-5 text-amber-400 mb-4" />
              <div className="text-2xl font-semibold mb-1">1.2ms</div>
              <div className="text-xs text-slate-500 uppercase tracking-wider">Network Latency</div>
            </div>
            <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-2xl">
              <Shield className="w-5 h-5 text-emerald-400 mb-4" />
              <div className="text-2xl font-semibold mb-1">Active</div>
              <div className="text-xs text-slate-500 uppercase tracking-wider">Protocol Guard</div>
            </div>
            <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-2xl">
              <Activity className="w-5 h-5 text-indigo-400 mb-4" />
              <div className="text-2xl font-semibold mb-1">{uptime}</div>
              <div className="text-xs text-slate-500 uppercase tracking-wider">System Uptime</div>
            </div>
          </div>

          <div className="p-8 bg-slate-900/40 border border-slate-800 rounded-3xl min-h-[400px]">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-lg font-medium flex items-center gap-2">
                <Layout className="w-4 h-4 text-slate-500" /> Environment Assets
              </h2>
              <button className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">Deploy New Instance</button>
            </div>
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-800 rounded-2xl text-slate-600">
              <p>No active deployments in this sector.</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-3xl backdrop-blur-xl">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Server className="w-4 h-4" /> Family Topology
            </h3>
            <div className="space-y-3">
              <NodeStatus name="lbc.network (Mother)" status="online" latency="0.4ms" />
              <NodeStatus name="lbchub.io (Protocol)" status="online" latency="0.8ms" />
              <NodeStatus name="lbc-hub.com (Sister)" status="online" latency="1.1ms" />
              <NodeStatus name="lbchub.site (Home)" status="online" latency="Local" />
            </div>
          </div>

          <div className="p-6 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl shadow-lg shadow-indigo-500/10">
            <Globe className="w-6 h-6 text-white/80 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">LBC Global Mesh</h3>
            <p className="text-indigo-100 text-sm leading-relaxed mb-4">
              Your session is currently tunneled through the hardware-verified tablet node.
            </p>
            <button className="w-full py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-sm font-medium transition-all">
              Manage Node Hardware
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}