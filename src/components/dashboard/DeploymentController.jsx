import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Rocket, CheckCircle2, ArrowUpRight } from 'lucide-react';

const STAGES = ['IDLE', 'PACKAGING', 'SIGNING', 'SHIPPING', 'SUCCESS'];

function Step({ label, active, completed }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full transition-all duration-500 ${
          completed ? 'bg-emerald-500' : active ? 'bg-emerald-400 animate-ping' : 'bg-white/5'
        }`} />
        <span className={`text-xs font-mono tracking-tight transition-colors ${
          completed || active ? 'text-white/80' : 'text-white/20'
        }`}>{label}</span>
      </div>
      {completed && <CheckCircle2 size={12} className="text-emerald-500" />}
    </div>
  );
}

export default function DeploymentController() {
  const [stage, setStage] = useState('IDLE');

  const startDeploy = async () => {
    setStage('PACKAGING');
    setTimeout(() => setStage('SIGNING'), 800);
    setTimeout(() => setStage('SHIPPING'), 1600);

    try {
      await base44.functions.invoke('lbcDeployerV2', {
        target: 'mother_node',
        payload: { origin: 'lbchub.site', components: ['ProtocolGuard', 'SisterSync'] }
      });
      setTimeout(() => setStage('SUCCESS'), 2400);
      setTimeout(() => setStage('IDLE'), 5400);
    } catch (_) {
      setTimeout(() => setStage('IDLE'), 2400);
    }
  };

  return (
    <div className="bg-slate-900 border border-emerald-500/10 rounded-3xl p-6 relative overflow-hidden">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-xl font-bold text-white">Orchestration_Pipeline</h3>
          <p className="text-[10px] font-mono text-emerald-500/40 uppercase tracking-widest">Target: lbc.network // Mother_Node</p>
        </div>
        <Rocket className={`w-6 h-6 ${stage !== 'IDLE' ? 'text-emerald-400 animate-bounce' : 'text-white/10'}`} />
      </div>

      <div className="space-y-4 mb-8">
        <Step
          label="Package_Protocol_Update"
          active={stage === 'PACKAGING'}
          completed={['SIGNING', 'SHIPPING', 'SUCCESS'].includes(stage)}
        />
        <Step
          label="Cryptographic_Signature"
          active={stage === 'SIGNING'}
          completed={['SHIPPING', 'SUCCESS'].includes(stage)}
        />
        <Step
          label="Transmit_to_Mother_Node"
          active={stage === 'SHIPPING'}
          completed={stage === 'SUCCESS'}
        />
      </div>

      <button
        onClick={startDeploy}
        disabled={stage !== 'IDLE'}
        className="w-full py-4 bg-emerald-500 text-black font-black rounded-2xl hover:bg-emerald-400 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
      >
        {stage === 'IDLE' ? (
          <>INITIALIZE_PUSH <ArrowUpRight size={18} /></>
        ) : (
          <span className="animate-pulse">{stage}...</span>
        )}
      </button>

      {stage === 'SUCCESS' && (
        <div className="absolute inset-0 bg-emerald-500 flex items-center justify-center gap-3">
          <CheckCircle2 className="text-black w-8 h-8" />
          <span className="text-black font-black text-xl italic tracking-tighter uppercase">Deployment_Complete</span>
        </div>
      )}
    </div>
  );
}