import React, { useState } from 'react';
import LBCDeploymentEngine from '@/pages/LBCDeploymentEngine';
import LBCProtocolGuard from './LBCProtocolGuard';
import { ShieldAlert, Unlock } from 'lucide-react';

export default function LBCSecureOrchestrator() {
  const [authSignature, setAuthSignature] = useState(null);
  const [isDeploying, setIsDeploying] = useState(false);

  const handleVerification = (signature) => {
    setAuthSignature(signature);
  };

  const clearAuthorization = () => {
    setAuthSignature(null);
  };

  return (
    <div className="space-y-12 max-w-5xl mx-auto">
      {!authSignature ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-8 animate-in fade-in duration-500">
          <div className="text-center space-y-2">
            <div className="inline-flex p-4 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-500 mb-4">
              <ShieldAlert size={32} />
            </div>
            <h2 className="text-2xl font-semibold text-white">Action Required</h2>
            <p className="text-slate-500 max-w-sm mx-auto">
              Deployment controls are locked. Provide a hardware-backed signature from the Architect Tablet to proceed.
            </p>
          </div>
          <div className="w-full max-w-md">
            <LBCProtocolGuard onVerified={handleVerification} isProcessing={isDeploying} />
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-in zoom-in-95 duration-300">
          <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl">
            <div className="flex items-center gap-3 text-emerald-400">
              <Unlock size={18} />
              <span className="text-sm font-medium">Hardware Authorized: {authSignature.substring(0, 16)}...</span>
            </div>
            <button 
              onClick={clearAuthorization}
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              Revoke Access
            </button>
          </div>
          
          <LBCDeploymentEngine signature={authSignature} />
          
          <p className="text-center text-xs text-slate-600 font-mono">
            Commands signed via SECURE_ENCLAVE_NODE_TAB_01
          </p>
        </div>
      )}
    </div>
  );
}