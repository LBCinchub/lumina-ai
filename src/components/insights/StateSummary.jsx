import React from 'react';
import { Activity, Target, AlertTriangle } from 'lucide-react';

export default function StateSummary({ summary }) {
  if (!summary) return null;

  return (
    <div className="grid grid-cols-3 gap-3 mb-6">
      <div className="bg-emerald-500/[0.02] border border-emerald-500/10 rounded-xl p-3">
        <div className="flex items-center gap-1.5 text-emerald-600/70 mb-1">
          <Activity className="w-3.5 h-3.5" />
          <span className="text-[10px] uppercase font-bold tracking-widest">Version</span>
        </div>
        <div className="text-lg font-bold text-emerald-50">{summary.version || '—'}</div>
      </div>
      <div className="bg-emerald-500/[0.02] border border-emerald-500/10 rounded-xl p-3">
        <div className="flex items-center gap-1.5 text-emerald-600/70 mb-1">
          <Target className="w-3.5 h-3.5" />
          <span className="text-[10px] uppercase font-bold tracking-widest">Goals</span>
        </div>
        <div className="text-lg font-bold text-emerald-50">{summary.goals_count ?? 0}</div>
      </div>
      <div className="bg-emerald-500/[0.02] border border-emerald-500/10 rounded-xl p-3">
        <div className="flex items-center gap-1.5 text-red-500/60 mb-1">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span className="text-[10px] uppercase font-bold tracking-widest">Debt</span>
        </div>
        <div className="text-lg font-bold text-emerald-50">{summary.debt_count ?? 0}</div>
      </div>
    </div>
  );
}