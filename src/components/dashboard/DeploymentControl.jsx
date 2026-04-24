import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Rocket, Package, CheckCircle2, Terminal } from 'lucide-react';

const STAGING_ITEMS = [
  { label: 'ProtocolGuard v2.4', active: true },
  { label: 'SisterSync Handshake', active: true },
  { label: 'Telemetry Polling Update', active: false },
];

function StagingItem({ label, active }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white/[0.02] border border-white/[0.03] rounded-xl">
      <div className="flex items-center gap-3">
        <Package size={14} className={active ? 'text-emerald-500' : 'text-white/10'} />
        <span className={`text-xs ${active ? 'text-white/80' : 'text-white/20'}`}>{label}</span>
      </div>
      {active
        ? <CheckCircle2 size={14} className="text-emerald-500" />
        : <div className="w-3.5 h-3.5 border border-white/10 rounded-full" />
      }
    </div>
  );
}

export default function DeploymentControl() {
  const [deploying, setDeploying] = useState(false);
  const [status, setStatus] = useState('IDLE');
  const [deployedVersion, setDeployedVersion] = useState(null);

  const handleDeploy = async () => {
    setDeploying(true);
    try {
      const components = STAGING_ITEMS.filter(i => i.active).map(i => i.label);
      const res = await base44.functions.invoke('lbcDeployer', { action: 'push', components });
      if (res.data?.success) {
        setStatus('SUCCESS');
        setDeployedVersion(res.data.version);
      } else {
        setStatus('IDLE');
      }
    } catch (_) {
      setStatus('IDLE');
    }
    setDeploying(false);
  };

  return (
    <div className="bg-slate-900 border border-emerald-500/10 rounded-3xl p-6 overflow-hidden">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="font-bold text-lg leading-none">Deployment_Orchestrator</h3>
          <p className="text-[10px] text-emerald-500/40 font-mono uppercase mt-1 tracking-widest">Target: lbc.network // Production</p>
        </div>
        <div className="p-2 bg-emerald-500/10 rounded-xl">
          <Rocket className={`w-5 h-5 text-emerald-500 ${deploying ? 'animate-bounce' : ''}`} />
        </div>
      </div>

      <div className="space-y-4 mb-8">
        {STAGING_ITEMS.map(item => <StagingItem key={item.label} {...item} />)}
      </div>

      <div className="bg-black/40 rounded-2xl p-4 mb-6 border border-white/[0.03]">
        <div className="flex items-center gap-2 mb-2 text-emerald-500/50">
          <Terminal size={12} />
          <span className="text-[10px] font-mono uppercase tracking-widest">Release_Console</span>
        </div>
        <div className="font-mono text-[10px] space-y-1">
          <p className="text-white/40">{'>'} manifest_signed: HMAC-SHA256</p>
          <p className="text-white/40">{'>'} target_nodes: lbc.network, lbc-hub.io</p>
          {status === 'SUCCESS' && (
            <p className="text-emerald-500">{'>'} broadcast_complete: {deployedVersion || 'v2.1.1'} live.</p>
          )}
        </div>
      </div>

      <button
        onClick={handleDeploy}
        disabled={deploying || status === 'SUCCESS'}
        className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
          status === 'SUCCESS'
            ? 'bg-emerald-500/10 text-emerald-500'
            : 'bg-emerald-500 text-black hover:scale-[1.02] active:scale-95'
        } disabled:opacity-80`}
      >
        {deploying ? 'BROADCASTING...' : status === 'SUCCESS' ? 'SYSTEM_SYNCED' : 'PUSH_TO_MOTHER_NODE'}
      </button>
    </div>
  );
}