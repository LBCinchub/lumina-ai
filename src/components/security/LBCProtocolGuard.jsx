import React, { useState } from 'react';
import { ShieldCheck, Fingerprint, Lock, Cpu } from 'lucide-react';

export default function LBCProtocolGuard({ onVerified, isProcessing }) {
  const [stage, setStage] = useState('idle');

  const initiateHardwareHandshake = async () => {
    setStage('challenging');
    
    const nonce = crypto.randomUUID();
    
    setTimeout(() => {
      setStage('verifying');
      
      setTimeout(() => {
        const simulatedSignature = `lbc_sig_${btoa(nonce).substring(0, 32)}`;
        onVerified(simulatedSignature);
        setStage('idle');
      }, 1200);
    }, 1000);
  };

  return (
    <div className="bg-slate-900/60 border border-indigo-500/30 rounded-3xl p-8 backdrop-blur-md relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <ShieldCheck size={120} className="text-indigo-400" />
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
            <Lock size={20} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Hardware Authorization</h3>
            <p className="text-xs text-slate-500 uppercase tracking-widest font-mono">Status: {stage === 'idle' ? 'Awaiting Signature' : 'Handshake in Progress'}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-black/40 border border-slate-800 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Cpu className="text-slate-500" size={18} />
              <span className="text-sm text-slate-300">Architect Tablet (Verified)</span>
            </div>
            <div className={`w-2 h-2 rounded-full ${stage !== 'idle' ? 'bg-indigo-400 animate-pulse' : 'bg-emerald-400'}`} />
          </div>

          <button
            onClick={initiateHardwareHandshake}
            disabled={stage !== 'idle' || isProcessing}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-3 group"
          >
            {stage === 'idle' ? (
              <>
                <Fingerprint size={20} className="group-hover:scale-110 transition-transform" />
                Sign Deployment Request
              </>
            ) : (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Validating Secure Enclave...
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}