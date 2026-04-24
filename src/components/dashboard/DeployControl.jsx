import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Rocket, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function DeployControl({ moduleName = 'core', payload = {} }) {
  const [status, setStatus] = useState('IDLE');

  const triggerDeploy = async () => {
    setStatus('DEPLOYING');
    try {
      const res = await base44.functions.invoke('lbcDeployer', { moduleName, payload });
      setStatus(res.data?.success ? 'SUCCESS' : 'ERROR');
    } catch {
      setStatus('ERROR');
    }
    setTimeout(() => setStatus('IDLE'), 4000);
  };

  return (
    <div className="bg-slate-900 border border-emerald-500/10 rounded-3xl p-6 relative overflow-hidden">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-emerald-50 font-bold mb-1">Production Push</h4>
          <p className="text-[10px] text-emerald-500/40 font-mono uppercase tracking-widest">Target: lbc.network</p>
        </div>

        <button
          onClick={triggerDeploy}
          disabled={status !== 'IDLE'}
          className={`flex items-center gap-3 px-6 py-3 rounded-2xl font-bold transition-all text-xs ${
            status === 'SUCCESS' ? 'bg-emerald-500 text-black' :
            status === 'ERROR'   ? 'bg-red-500 text-white' :
            'bg-white/5 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50'
          }`}
        >
          {status === 'IDLE'      && <Rocket size={18} />}
          {status === 'DEPLOYING' && <Loader2 size={18} className="animate-spin" />}
          {status === 'SUCCESS'   && <CheckCircle2 size={18} />}
          {status === 'ERROR'     && <AlertCircle size={18} />}
          {status === 'IDLE'      && 'PUSH_TO_MOTHER'}
          {status === 'DEPLOYING' && 'UPLOADING...'}
          {status === 'SUCCESS'   && 'DEPLOYED'}
          {status === 'ERROR'     && 'FAILED'}
        </button>
      </div>

      <div className="mt-4 flex gap-1">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all ${
              status === 'DEPLOYING' ? 'bg-emerald-500/20 animate-pulse' : 'bg-emerald-500/5'
            }`}
          />
        ))}
      </div>
    </div>
  );
}