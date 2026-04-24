import React, { useState } from 'react';
import { ShieldAlert, ShieldCheck, Lock, Unlock, Fingerprint } from 'lucide-react';

export default function SecurityShield() {
  const [isLocked, setIsLocked] = useState(true);
  const status = isLocked ? 'ACTIVE' : 'BYPASSED';

  return (
    <div className="bg-slate-900 border border-emerald-500/10 rounded-3xl p-6 overflow-hidden relative group">
      {/* Background pulse */}
      <div className={`absolute -inset-2 bg-emerald-500/5 blur-3xl rounded-full transition-opacity duration-1000 ${isLocked ? 'opacity-100' : 'opacity-0'}`} />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl ${isLocked ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
              {isLocked ? <ShieldCheck size={24} /> : <ShieldAlert size={24} />}
            </div>
            <div>
              <h3 className="font-bold text-lg leading-none">Protocol_Guard</h3>
              <p className="text-[10px] text-emerald-500/40 font-mono uppercase mt-1 tracking-widest">
                Shield_Status: {status}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsLocked(l => !l)}
            className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-all text-white/20 hover:text-white"
          >
            {isLocked ? <Lock size={16} /> : <Unlock size={16} />}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-black/40 p-4 rounded-2xl border border-white/[0.03]">
            <p className="text-[9px] font-mono text-white/20 uppercase mb-1">Enc_Algorithm</p>
            <p className="text-xs font-bold text-white/70">HMAC-SHA256</p>
          </div>
          <div className="bg-black/40 p-4 rounded-2xl border border-white/[0.03]">
            <p className="text-[9px] font-mono text-white/20 uppercase mb-1">Auth_Method</p>
            <p className="text-xs font-bold text-white/70">Sig_Verification</p>
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
          <Fingerprint className="text-emerald-500/40 w-5 h-5 shrink-0" />
          <div className="flex-1">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[9px] font-mono text-emerald-700 uppercase">Integrity_Check</span>
              <span className="text-[9px] font-mono text-emerald-500">100% SECURE</span>
            </div>
            <div className="h-1 w-full bg-emerald-950 rounded-full overflow-hidden">
              <div className={`h-full transition-all duration-700 ${isLocked ? 'bg-emerald-500 w-full' : 'bg-red-500 w-1/3'}`} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}