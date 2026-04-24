import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Share2, RefreshCw, ExternalLink, ShieldCheck, Activity } from 'lucide-react';

const StatusRow = ({ label, value, muted = false }) => (
  <li className="flex justify-between items-center border-b border-white/[0.03] pb-2">
    <span className="text-[10px] uppercase font-mono tracking-widest text-white/20">{label}</span>
    <span className={`text-xs font-medium ${muted ? 'text-white/10' : 'text-white/70'}`}>{value}</span>
  </li>
);

export default function YourTwinDigital() {
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState('IDLE');
  const [twinData, setTwinData] = useState(null);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await base44.functions.invoke('sisterSync', {});
      if (res.data?.success) {
        setTwinData(res.data.payload);
        setStatus('SYNCED');
      } else {
        setStatus('ERROR');
      }
    } catch {
      setStatus('ERROR');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="p-8 bg-slate-950 min-h-screen font-sans text-emerald-50">
      <div className="max-w-5xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Share2 className="w-4 h-4 text-emerald-500" />
              <span className="text-emerald-500/60 font-mono text-[10px] tracking-widest uppercase">LBC_Ecosystem_Sync</span>
            </div>
            <h1 className="text-4xl font-black tracking-tighter">Your Twin</h1>
            <p className="text-emerald-100/30 text-sm mt-1">Synchronizing intelligence across lbc-hub.com and lbchub.site.</p>
          </div>

          <button
            onClick={handleSync}
            disabled={syncing}
            className="group relative flex items-center gap-3 px-8 py-4 bg-emerald-500 text-black font-bold rounded-2xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 overflow-hidden"
          >
            <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
            <span className="relative z-10">{syncing ? 'ALIGNING_CORES...' : 'INITIALIZE_SYNC'}</span>
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform" />
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Current Domain Card */}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/20 to-transparent rounded-3xl blur opacity-75 group-hover:opacity-100 transition duration-1000" />
            <div className="relative p-8 bg-slate-900 border border-emerald-500/20 rounded-3xl">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-2xl font-bold">lbchub.site</h3>
                  <span className="text-[10px] text-emerald-500 font-mono font-bold uppercase tracking-widest">Primary_Identity</span>
                </div>
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <Activity className="text-emerald-500 w-5 h-5" />
                </div>
              </div>
              <ul className="space-y-4 mb-8">
                <StatusRow label="Logic_State" value="Autonomous" />
                <StatusRow label="Persistence" value="Verified" />
                <StatusRow label="Evolution" value="v2.1.0-alpha" />
              </ul>
              <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-400/60 bg-emerald-500/5 px-3 py-1 rounded-full w-fit">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                SYSTEM_OPTIMAL
              </div>
            </div>
          </div>

          {/* Sister Domain Card */}
          <div className="relative group">
            <div className={`absolute -inset-0.5 bg-gradient-to-r ${status === 'SYNCED' ? 'from-blue-500/20' : 'from-slate-800/50'} to-transparent rounded-3xl blur opacity-75 transition duration-1000`} />
            <div className={`relative p-8 bg-slate-900 border ${status === 'SYNCED' ? 'border-blue-500/20' : 'border-slate-800'} rounded-3xl transition-colors`}>
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-2xl font-bold text-slate-100">lbc-hub.com</h3>
                  <span className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-widest">Mirror_Identity</span>
                </div>
                <a href="https://lbc-hub.com" target="_blank" rel="noreferrer" className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-all">
                  <ExternalLink size={18} className="text-white/20" />
                </a>
              </div>
              <ul className="space-y-4 mb-8">
                <StatusRow label="Connection" value={status === 'SYNCED' ? 'Secured' : 'Offline'} muted={status !== 'SYNCED'} />
                <StatusRow label="Protocol" value={status === 'SYNCED' ? 'LBC_v2' : 'Unknown'} muted={status !== 'SYNCED'} />
                <StatusRow label="Heartbeat" value={status === 'SYNCED' && twinData ? `${twinData.heartbeat}ms` : 'None'} muted={status !== 'SYNCED'} />
              </ul>
              <div className={`flex items-center gap-2 text-[10px] font-bold px-3 py-1 rounded-full w-fit ${
                status === 'SYNCED' ? 'text-blue-400 bg-blue-500/10' : status === 'ERROR' ? 'text-red-400 bg-red-500/10' : 'text-slate-600 bg-slate-800'
              }`}>
                {status === 'SYNCED' && <ShieldCheck className="w-3 h-3" />}
                {status === 'SYNCED' ? 'HANDSHAKE_COMPLETED' : status === 'ERROR' ? 'SYNC_FAILED' : 'WAITING_FOR_INIT'}
              </div>
            </div>
          </div>
        </div>

        {/* Bridge Visualization */}
        <div className="mt-12 p-10 bg-gradient-to-b from-emerald-500/[0.03] to-transparent border border-emerald-500/10 rounded-[2.5rem] text-center">
          <div className="inline-flex items-center gap-4 bg-black/40 px-6 py-2 rounded-full border border-emerald-500/10 mb-6">
            <div className={`w-2 h-2 rounded-full ${status === 'SYNCED' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-slate-700'}`} />
            <span className="text-[10px] font-mono tracking-widest text-emerald-500/80">LBC_BRIDGE_PROTOCOL_ACTIVE</span>
          </div>
          <h2 className="text-xl font-medium text-emerald-50/80 mb-2">Two Domains. One Vision.</h2>
          <p className="text-sm text-emerald-100/20 max-w-lg mx-auto leading-relaxed">
            By aligning lbchub.site with lbc-hub.com, we ensure the protocol remains decentralized but synchronized. Total ecosystem visibility in a single handshake.
          </p>
        </div>
      </div>
    </div>
  );
}