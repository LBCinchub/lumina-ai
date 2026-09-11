import React from 'react';
import {
  Briefcase, Plane, GraduationCap, Dumbbell, Sparkles, ListTodo, Plus,
} from 'lucide-react';
import { AGENT_TEMPLATES } from './agentTemplates';

const ICONS = {
  Briefcase, Plane, GraduationCap, Dumbbell, Sparkles, ListTodo,
};

// One-click starter template gallery shown at the start of the create wizard.
// Picking a template prefills persona, voice, expertise, and instructions.
export default function AgentTemplateGallery({ onPick, onScratch }) {
  return (
    <div>
      <h3 className="text-sm font-medium mb-1">Start From A Template</h3>
      <p className="text-[11.5px] text-muted-foreground mb-4">
        One click prefills the persona, voice, and instructions — a working agent in under a minute.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
        {AGENT_TEMPLATES.map(t => {
          const Icon = ICONS[t.icon] || Plus;
          return (
            <button
              key={t.id}
              onClick={() => onPick(t)}
              className="flex flex-col gap-2.5 p-4 rounded-lg border border-border/40 bg-muted/20 hover:bg-accent/50 hover:border-primary/40 transition-all text-left"
            >
              <div className="w-8 h-8 rounded-md bg-accent flex items-center justify-center">
                <Icon className="w-4 h-4 text-foreground/70" strokeWidth={1.75} />
              </div>
              <div>
                <div className="text-[12.5px] font-medium">{t.label}</div>
                <div className="text-[10.5px] text-muted-foreground line-clamp-2 mt-0.5">{t.expertise}</div>
              </div>
            </button>
          );
        })}
      </div>
      <button
        onClick={onScratch}
        className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-border hover:border-primary/40 hover:bg-accent/30 transition-all text-[12px] text-muted-foreground hover:text-foreground"
      >
        <Plus className="w-3.5 h-3.5" strokeWidth={1.75} />
        Start From Scratch
      </button>
    </div>
  );
}