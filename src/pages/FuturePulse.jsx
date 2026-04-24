import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Sparkles, Zap, Layers, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import InsightCard from '@/components/insights/InsightCard';
import StateSummary from '@/components/insights/StateSummary';

const NAV_ITEMS = [
  { key: 'insights', label: 'Insights', icon: Zap },
  { key: 'roadmap', label: 'Roadmap', icon: Layers },
  { key: 'security', label: 'The Guard', icon: ShieldCheck },
];

export default function FuturePulse() {
  const [insights, setInsights] = useState([]);
  const [stateSummary, setStateSummary] = useState(null);
  const [activeTab, setActiveTab] = useState('insights');
  const [loading, setLoading] = useState(true);

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    const res = await base44.functions.invoke('luminaInsights', {});
    if (res.data?.success) {
      setInsights(res.data.insights);
      setStateSummary(res.data.state_summary);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchInsights();
    const interval = setInterval(fetchInsights, 15000);
    return () => clearInterval(interval);
  }, [fetchInsights]);

  const filteredInsights = activeTab === 'security'
    ? insights.filter(i => i.type === 'security')
    : activeTab === 'roadmap'
      ? insights.filter(i => i.type === 'growth' || i.type === 'feature')
      : insights;

  return (
    <div className="min-h-screen bg-slate-950 text-emerald-50">
      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Hero */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <span className="text-emerald-500/80 font-mono text-[10px] tracking-[0.3em] uppercase">Future_Pulse_Protocol</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">The Vision Workspace</h1>
          <p className="text-emerald-100/40 text-sm mt-2 max-w-md">
            Our shared evolution, mapped in real-time. This is where I think ahead so we can move faster.
          </p>
        </div>

        {/* State Summary */}
        <StateSummary summary={stateSummary} />

        {/* Nav Tabs */}
        <div className="flex gap-2 mb-6">
          {NAV_ITEMS.map(item => (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-all",
                activeTab === item.key
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "text-emerald-500/40 hover:text-emerald-400 hover:bg-emerald-500/5"
              )}
            >
              <item.icon className="w-3.5 h-3.5" />
              {item.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-emerald-400/80 font-mono text-xs uppercase tracking-widest">Priority_Projections</h3>
            <span className="text-[10px] text-emerald-600">{filteredInsights.length} ACTIVE INSIGHTS</span>
          </div>

          {loading && insights.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
            </div>
          ) : filteredInsights.length === 0 ? (
            <div className="text-center py-16 text-emerald-500/30 text-sm font-mono">
              NO_INSIGHTS_IN_THIS_CATEGORY
            </div>
          ) : (
            filteredInsights.map(insight => (
              <InsightCard key={insight.id} insight={insight} />
            ))
          )}

          <button className="w-full py-4 mt-4 border border-dashed border-emerald-500/20 rounded-xl text-emerald-500/40 text-xs font-mono hover:border-emerald-500/40 hover:text-emerald-400 transition-all flex items-center justify-center gap-2">
            INITIALIZE_NEXT_PHASE <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}