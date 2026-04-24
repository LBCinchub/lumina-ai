import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Rocket, CheckCircle2, AlertCircle, ShieldCheck, Zap } from 'lucide-react';

export default function DeployCommand({ bundle = {} }) {
  const [stage, setStage] = useState('IDLE');

  const startDeployment = async () => {
    setStage('PREFLIGHT');
    await new Promise(r => setTimeout(r, 1500));
    setStage('DEPLOYING');
    try {
      const res = await base44.functions.invoke('lbcOrchestratorV2', { bundle });
      setStage(res.data?.success ? 'SUCCESS' : 'ERROR');
    } catch {
      setStage('ERROR');
    }
    if (stage !== 'SUCCESS') setTimeout(() => setStage('IDLE'), 4000);
  };

  return (
    <div className="bg-slate-900 border border-emerald-500/20 rounded-[2.5rem] p-8 relative overflow-hidden">
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Rocket className="w-4 h-4 text-emerald-500" />
            <span className="text-emerald-500/60 font-mono text-[10px] tracking-widest uppercase">Deployment_Pipeline_v2</span>
          </div>
          <h2 className="text-2xl font-bold mb-2">Push to Mother Node</h2>
          <p className="text-emerald-100/30 text-sm max-w-md">
            Deploy current site logic and protocol updates to lbc.network. This will propagate across all synchronized hubs.
          </p>
        </div>

        <button
          onClick={startDeployment}
          disabled={stage !== 'IDLE' && stage !== 'ERROR'}
          className={`px-10 py-5 rounded-2xl font-black transition-all transform hover:scale-105 active:scale-95 flex items-center gap-3 ${
            stage === 'SUCCESS' ? 'bg-emerald-500 text-black' :
            stage === 'ERROR'   ? 'bg-red-500 text-white' :
            'bg-white text-black disabled:opacity-80'
          }`}
        >
          {stage === 'IDLE'      && <><Zap size={18} /> INITIALIZE_PUSH</>}
          {stage === 'PREFLIGHT' && <><ShieldCheck size={18} className="animate-pulse" /> VERIFYING_GUARD...</>}
          {stage === 'DEPLOYING' && <><Rocket size={18} className="animate-bounce" /> UPLOADING_BUNDLE...</>}
          {stage === 'SUCCESS'   && <><CheckCircle2 size={18} /> DEPLOYMENT_COMPLETE</>}
          {stage === 'ERROR'     && <><AlertCircle size={18} /> FAILED — RETRY</>}
        </button>
      </div>

      {(stage === 'DEPLOYING' || stage === 'SUCCESS') && (
        <div className="mt-8 h-1 w-full bg-emerald-950 rounded-full overflow-hidden">
          <div className={`h-full bg-emerald-500 transition-all duration-700 ${stage === 'SUCCESS' ? 'w-full' : 'w-2/3'}`} />
        </div>
      )}
    </div>
  );
}