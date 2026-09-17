import React from 'react';
import { ArrowLeft, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { voiceLabel } from './agentTemplates';

const TABS = [
  { id: 'chat', label: 'Chat' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'memory', label: 'Memory' },
  { id: 'autopilot', label: 'Autopilot' },
  { id: 'connect', label: 'Connect' },
];

// Header for one agent's detail view: back button, identity, and the
// Chat / Autopilot / Connect tab strip.
export default function AgentDetailHeader({ agent, onBack, activeTab, onTabChange }) {
  return (
    <div className="shrink-0 border-b border-border/40">
      <div className="px-4 md:px-6 py-3 flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-1.5 -ml-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
          title="Back To My Agents"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.75} />
        </button>
        <div className="w-9 h-9 rounded-md bg-accent flex items-center justify-center shrink-0">
          <Bot className="w-4 h-4 text-foreground/70" strokeWidth={1.5} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium truncate">{agent.name}</div>
          <div className="text-[11px] text-muted-foreground truncate">
            {agent.persona} · {voiceLabel(agent.voice)}
          </div>
        </div>
      </div>
      <div className="px-4 md:px-6 flex items-center gap-1 pb-2">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => onTabChange(t.id)}
            className={cn(
              "px-3 py-1.5 rounded-md text-[12px] transition-colors",
              activeTab === t.id
                ? "bg-accent text-foreground font-medium"
                : "text-muted-foreground/70 hover:text-foreground hover:bg-accent/50"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}