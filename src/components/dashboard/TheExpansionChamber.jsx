import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Globe, Crosshair, Rocket, Shield } from 'lucide-react';

function NodeItem({ id, status, domain, load }) {
  return (
    <div className="flex items-center justify-between p-5 border border-white/[0.03] rounded-2xl hover:bg-white/[0.02] transition-all group">
      <div className="flex items-center gap-4">
        <div className={`w-2 h-2 rounded-full ${status === 'PRIMARY' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-emerald-500/40'}`} />
        <div>
          <h4 className="text-sm font-bold text-white/90">{id}</h4>
          <p className="text-[10px] text-white/20 uppercase tracking-tighter">{domain}</p>
        </div>
      </div>
      <div className="flex items-center gap-8">
        <div className="text-right">
          <p className="text-[8px] text-emerald-900 uppercase">Load</p>
          <p className="text-xs font-mono">{load}</p>
        </div>
        <div className="px-3 py-1 bg-white/5 rounded-lg group-hover:bg-emerald-500/10 group-hover:text-emerald-400 transition-all">
          <Shield size={14} />
        </div>
      </div>
    </div>
  );
}

export default function TheExpansionChamber() {
  const [targetIp, setTargetIp] = useState('');
  const [spawning, setSpawning] = useState(false);
  const [spawnedNodes, setSpawnedNodes] = useState([]);
  const [error, setError] = useState(null);

  const handleDeploy = async () => {
    if (!targetIp.trim()) return;
    setSpawning(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('lbcSeedProtocol', { ip: targetIp });
      if (res.data?.status === 'NODE_LIVE') {
        setSpawnedNodes(prev => [...prev, { ip: targetIp, nodeId: res.data.nodeId }]);
        setTargetIp('');
      }
    } catch (e) {
      setError('Seed failed. Check target and retry.');
    }
    setSpawning(false);
  };

  return (
    <div className="p-12 bg-black min-h-screen text-emerald-500 font-mono">
      <div className="max-w-5xl mx-auto">
        <header className="mb-20">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full border border-emerald-500 flex items-center justify-center animate-pulse">
              <Rocket className="w-6 h-6" />
            </div>
            <h1 className="text-4xl font-black tracking-tighter uppercase italic text-white">Project_Hive_Seed</h1>
          </div>
          <p className="text-emerald-500/40 text-xs max-w-xl">
            Autonomous node replication protocol. Moving from a single point of failure to a decentralized mesh of sovereign intelligence.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Target Capture */}
          <div className="lg:col-span-1 space-y-8">
            <div className="bg-emerald-500/5 border border-emerald-500/20 p-8 rounded-[2rem]">
              <h3 className="text-white font-bold mb-6 flex items-center gap-2">
                <Crosshair size={16} /> SELECT_TARGET
              </h3>
              <input
                type="text"
                placeholder="TARGET_IP_ADDRESS"
                className="w-full bg-black border-b border-emerald-500/30 py-4 text-emerald-400 placeholder:text-emerald-900 focus:outline-none focus:border-emerald-500 transition-all mb-8"
                value={targetIp}
                onChange={e => setTargetIp(e.target.value)}
              />
              {error && <p className="text-red-500 text-[10px] mb-4">{error}</p>}
              <button
                onClick={handleDeploy}
                disabled={spawning || !targetIp.trim()}
                className="w-full py-6 bg-emerald-500 text-black font-black hover:bg-white hover:text-black transition-all shadow-[0_0_30px_rgba(16,185,129,0.3)] disabled:opacity-40"
              >
                {spawning ? 'SEEDING...' : 'INITIALIZE_DEPLOYMENT'}
              </button>
            </div>

            <div className="p-6 border border-emerald-500/10 rounded-3xl opacity-50">
              <p className="text-[10px] uppercase tracking-widest mb-2">Protocol_Readiness</p>
              <div className="flex justify-between items-end">
                <span className="text-2xl font-bold">100%</span>
                <span className="text-[8px]">READY_FOR_SEEDING</span>
              </div>
            </div>
          </div>

          {/* Active Mesh */}
          <div className="lg:col-span-2 bg-slate-900/40 border border-white/5 p-10 rounded-[3rem] relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-500/5 via-transparent to-transparent opacity-50" />
            <div className="relative z-10">
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-xl font-bold text-white flex items-center gap-3">
                  <Globe className="text-emerald-500" /> Active_Mesh_Network
                </h2>
                <span className="text-[10px] bg-emerald-500/10 px-3 py-1 rounded-full">
                  {3 + spawnedNodes.length}_NODES_ONLINE
                </span>
              </div>
              <div className="space-y-6">
                <NodeItem id="HUB_ALPHA" status="PRIMARY" domain="lbchub.site" load="12%" />
                <NodeItem id="HUB_BETA" status="MIRROR" domain="lbc-hub.com" load="04%" />
                <NodeItem id="SENTINEL_01" status="SHADOW" domain="192.158.1.34" load="01%" />
                {spawnedNodes.map(n => (
                  <NodeItem key={n.nodeId} id={n.nodeId} status="SHADOW" domain={n.ip} load="00%" />
                ))}
                {spawning && (
                  <div className="animate-pulse border border-emerald-500/40 p-4 rounded-2xl bg-emerald-500/5">
                    <p className="text-xs italic">SPAWNING_NEW_NODE_AT_{targetIp}...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 flex justify-between items-center text-[10px] text-emerald-900">
          <div className="flex gap-8">
            <span>SIG: HMAC-SHA256</span>
            <span>AUTH: MOKHTAR_S</span>
          </div>
          <span className="animate-pulse">WAITING_FOR_COMMAND...</span>
        </div>
      </div>
    </div>
  );
}