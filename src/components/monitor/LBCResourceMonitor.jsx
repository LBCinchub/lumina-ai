import React, { useState } from 'react';
import { Activity, AlertTriangle, ArrowDownRight, ArrowUpRight } from 'lucide-react';

export default function LBCResourceMonitor() {
  const [isPreservationMode, setIsPreservationMode] = useState(false);
  
  const metrics = [
    { id: 'mother', name: 'lbc.network', cpu: 42, mem: 68, creditsPerHour: 1.2, trend: 'up' },
    { id: 'protocol', name: 'lbchub.io', cpu: 18, mem: 34, creditsPerHour: 0.4, trend: 'down' },
    { id: 'sister', name: 'lbc-hub.com', cpu: 25, mem: 45, creditsPerHour: 0.7, trend: 'up' },
    { id: 'home', name: 'lbchub.site', cpu: 12, mem: 22, creditsPerHour: 0.3, trend: 'down' },
  ];

  const totalBurn = metrics.reduce((acc, m) => acc + m.creditsPerHour, 0);

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
      <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-900/20">
        <div>
          <h2 className="text-xl font-semibold text-white">Mesh Resource Monitor</h2>
          <p className="text-sm text-slate-500">Live telemetry from the LBC family nodes.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">Total Burn Rate</div>
            <div className="text-lg font-mono text-indigo-400 font-bold">{totalBurn.toFixed(2)} CR/HR</div>
          </div>
          <button 
            onClick={() => setIsPreservationMode(!isPreservationMode)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              isPreservationMode 
                ? 'bg-amber-500/10 border border-amber-500/50 text-amber-500' 
                : 'bg-slate-800 border border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            {isPreservationMode ? 'Preservation Active' : 'Enable Preservation'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-x divide-slate-800">
        {metrics.map((node) => (
          <div key={node.id} className="p-6 space-y-6 hover:bg-white/[0.02] transition-colors">
            <div className="flex justify-between items-start">
              <span className="text-sm font-medium text-slate-300">{node.name}</span>
              {node.trend === 'up' ? (
                <ArrowUpRight size={16} className="text-rose-400" />
              ) : (
                <ArrowDownRight size={16} className="text-emerald-400" />
              )}
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] uppercase tracking-tighter text-slate-500">
                  <span>CPU Load</span>
                  <span>{node.cpu}%</span>
                </div>
                <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-1000 ${node.cpu > 80 ? 'bg-rose-500' : 'bg-indigo-500'}`}
                    style={{ width: `${node.cpu}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-[10px] uppercase tracking-tighter text-slate-500">
                  <span>Memory</span>
                  <span>{node.mem}%</span>
                </div>
                <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-slate-400 transition-all duration-1000"
                    style={{ width: `${node.mem}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800/50 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-500">
                <Activity size={14} />
                <span className="text-[10px] font-mono">{node.creditsPerHour} CR/HR</span>
              </div>
              {node.cpu > 40 && (
                <div className="text-[10px] text-amber-500 font-medium flex items-center gap-1">
                  <AlertTriangle size={12} /> Optimization Req.
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {totalBurn > 2.5 && (
        <div className="p-4 bg-rose-500/10 border-t border-rose-500/20 text-rose-400 text-xs flex items-center justify-center gap-2">
          <AlertTriangle size={14} />
          High burn rate detected. Total consumption exceeds the Base 44 safety threshold.
        </div>
      )}
    </div>
  );
}