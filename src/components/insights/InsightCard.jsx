import React from 'react';
import { ShieldCheck, Zap, TrendingUp, Layers, ChevronRight } from 'lucide-react';

const TYPE_CONFIG = {
  optimization: { icon: Zap, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  feature: { icon: Layers, color: 'text-blue-400', bg: 'bg-blue-500/20' },
  security: { icon: ShieldCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  growth: { icon: TrendingUp, color: 'text-amber-400', bg: 'bg-amber-500/20' },
};

export default function InsightCard({ insight }) {
  const config = TYPE_CONFIG[insight.type] || TYPE_CONFIG.optimization;
  const Icon = config.icon;

  return (
    <div className="group bg-emerald-500/[0.02] border border-emerald-500/10 p-4 rounded-xl hover:bg-emerald-500/5 transition-all cursor-pointer flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className={`p-2 rounded-lg ${insight.readiness === 'ready' ? 'bg-emerald-500/20' : 'bg-amber-500/10'}`}>
          <Icon className={`w-4 h-4 ${config.color}`} />
        </div>
        <div>
          <h4 className="text-emerald-50 font-medium text-sm">{insight.title}</h4>
          <p className="text-emerald-100/30 text-xs mt-0.5 max-w-sm">{insight.description}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[10px] text-emerald-600/70 uppercase font-mono">Impact: {insight.impactScore}%</span>
            <span className="text-emerald-900 font-bold text-[8px]">•</span>
            <span className={`text-[10px] uppercase font-bold tracking-tighter ${insight.readiness === 'ready' ? 'text-emerald-500' : 'text-amber-500/60'}`}>
              {insight.readiness}
            </span>
          </div>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-emerald-800 group-hover:text-emerald-400 transition-colors" />
    </div>
  );
}