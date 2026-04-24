import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Server, Globe, Plus, Activity, Loader2 } from 'lucide-react';

export default function GlobalNodeGrid() {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [provisioning, setProvisioning] = useState(false);

  const fetchNodes = async () => {
    try {
      const res = await base44.functions.invoke('lbcNodeManager', { action: 'list' });
      if (res.data?.nodes) setNodes(res.data.nodes);
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => {
    fetchNodes();
    const interval = setInterval(fetchNodes, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleProvision = async () => {
    setProvisioning(true);
    await base44.functions.invoke('lbcNodeManager', { action: 'deploy', region: 'Auto' });
    await fetchNodes();
    setProvisioning(false);
  };

  return (
    <div className="bg-slate-900 border border-emerald-500/10 rounded-3xl p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Globe className="w-5 h-5 text-emerald-500" />
            Mother_Node_Distribution
          </h3>
          <p className="text-[10px] text-emerald-500/40 font-mono uppercase tracking-[0.2em] mt-1">Global_LBC_Infrastructure</p>
        </div>
        <button
          onClick={handleProvision}
          disabled={provisioning}
          className="flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-xl border border-emerald-500/20 transition-all text-xs font-bold disabled:opacity-50"
        >
          {provisioning ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          PROVISION_NODE
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="text-emerald-500 animate-spin" size={24} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {nodes.map((node) => (
            <div key={node.id} className="bg-black/40 border border-white/[0.03] p-5 rounded-2xl hover:border-emerald-500/30 transition-all group">
              <div className="flex justify-between items-start mb-6">
                <div className="p-3 bg-emerald-500/5 rounded-xl group-hover:bg-emerald-500/10 transition-colors">
                  <Server className="w-5 h-5 text-emerald-600" />
                </div>
                <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full ${
                  node.status === 'OPTIMAL' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                }`}>
                  {node.status}
                </span>
              </div>

              <div className="mb-4">
                <h4 className="text-sm font-bold text-white/90">{node.region}</h4>
                <p className="text-[10px] text-white/30 font-mono uppercase">{node.city}</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-[9px] font-mono text-white/20">
                  <span>CPU_LOAD</span>
                  <span>{node.load}%</span>
                </div>
                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-700 ${node.load > 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${node.load}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 flex items-center justify-between p-4 bg-emerald-500/[0.02] border border-emerald-500/5 rounded-2xl">
        <div className="flex items-center gap-4">
          <Activity className="w-4 h-4 text-emerald-900" />
          <span className="text-[10px] text-emerald-900 font-mono uppercase tracking-widest">Aggregate_Network_Health</span>
        </div>
        <span className="text-sm font-bold text-emerald-500">99.98%</span>
      </div>
    </div>
  );
}