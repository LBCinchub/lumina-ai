import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import AgentTemplateGallery from './AgentTemplateGallery';
import { AGENT_VOICES, PERSONA_OPTIONS } from './agentTemplates';

const STEP_LABELS = ['Name', 'Persona', 'Voice', 'Instructions', 'Knowledge'];

// Create Agent wizard: Templates → Name → Persona → Voice → Instructions → Knowledge → Create.
// All creation goes through the createUserAgent backend function, which stamps
// ownership server-side — the client never sends ownership fields.
export default function AgentCreateWizard({ knowledgeSources, onCancel, onCreate }) {
  const [step, setStep] = useState(-1); // -1 = template gallery
  const [form, setForm] = useState({
    name: '', persona: '', customPersona: '', voice: 'professional',
    instructions: '', expertise: '', knowledge_source_ids: [],
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  const effectivePersona = form.persona === 'Custom' ? form.customPersona.trim() : form.persona;

  const pickTemplate = (t) => {
    setForm(f => ({
      ...f,
      name: f.name || t.label,
      persona: t.persona,
      voice: t.voice,
      expertise: t.expertise,
      instructions: t.instructions,
    }));
    setError(null);
    setStep(3); // Jump to Instructions — everything else is prefilled.
  };

  const canNext = () => {
    if (step === 0) return form.name.trim().length > 0;
    if (step === 1) return effectivePersona.length > 0;
    if (step === 2) return true;
    if (step === 3) return form.instructions.trim().length > 0;
    return true;
  };

  const submit = async () => {
    setCreating(true);
    setError(null);
    const result = await onCreate({
      name: form.name.trim(),
      persona: effectivePersona,
      voice: form.voice,
      instructions: form.instructions.trim(),
      expertise: form.expertise.trim(),
      knowledge_source_ids: form.knowledge_source_ids,
    });
    if (result?.error) {
      setError(result.error);
      setCreating(false);
    }
    // On success the parent navigates away and unmounts this wizard.
  };

  const toggleKnowledge = (id) => {
    setForm(f => ({
      ...f,
      knowledge_source_ids: f.knowledge_source_ids.includes(id)
        ? f.knowledge_source_ids.filter(k => k !== id)
        : [...f.knowledge_source_ids, id],
    }));
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      <div className="shrink-0 px-5 md:px-8 py-4 border-b border-border/40 flex items-center gap-3">
        <button
          onClick={() => (step === -1 ? onCancel() : setStep(s => s - 1))}
          disabled={creating}
          className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
        >
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.75} />
          {step === -1 ? 'Cancel' : 'Back'}
        </button>
        <h2 className="font-serif text-lg tracking-tight">Create Agent</h2>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-minimal">
        <div className="max-w-2xl mx-auto px-5 md:px-6 py-6 animate-fade-up">
          {step === -1 ? (
            <AgentTemplateGallery onPick={pickTemplate} onScratch={() => setStep(0)} />
          ) : (
            <>
              <div className="flex items-center gap-2 mb-6">
                {STEP_LABELS.map((label, i) => (
                  <div key={label} className="flex items-center gap-2">
                    <div
                      className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium border",
                        i < step
                          ? "bg-primary text-primary-foreground border-primary"
                          : i === step
                            ? "border-primary text-primary"
                            : "border-border text-muted-foreground/50"
                      )}
                    >
                      {i + 1}
                    </div>
                    <span className={cn("text-[11px] hidden sm:inline", i === step ? "text-foreground" : "text-muted-foreground/60")}>
                      {label}
                    </span>
                    {i < STEP_LABELS.length - 1 && <div className="w-4 h-px bg-border" />}
                  </div>
                ))}
              </div>

              {step === 0 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[12px] font-medium mb-1.5">Agent Name</label>
                    <Input
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="e.g. Maya, My Strategy Brain"
                      maxLength={60}
                      autoFocus
                    />
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-3">
                  <label className="block text-[12px] font-medium">Pick A Persona</label>
                  <div className="flex flex-wrap gap-2">
                    {PERSONA_OPTIONS.map(p => (
                      <button
                        key={p}
                        onClick={() => setForm(f => ({ ...f, persona: p }))}
                        className={cn(
                          "px-3 py-1.5 rounded-full border text-[12px] transition-colors",
                          form.persona === p
                            ? "bg-primary/15 border-primary/50 text-primary"
                            : "border-border/60 text-muted-foreground hover:text-foreground hover:bg-accent/50"
                        )}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                  {form.persona === 'Custom' && (
                    <Input
                      value={form.customPersona}
                      onChange={e => setForm(f => ({ ...f, customPersona: e.target.value }))}
                      placeholder="Describe The Custom Persona"
                      maxLength={80}
                      autoFocus
                    />
                  )}
                </div>
              )}

              {step === 2 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {AGENT_VOICES.map(v => (
                    <button
                      key={v.value}
                      onClick={() => setForm(f => ({ ...f, voice: v.value }))}
                      className={cn(
                        "p-4 rounded-lg border text-left transition-all",
                        form.voice === v.value
                          ? "bg-primary/10 border-primary/50"
                          : "border-border/50 hover:bg-accent/40"
                      )}
                    >
                      <div className="text-[13px] font-medium">{v.label}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{v.description}</div>
                    </button>
                  ))}
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[12px] font-medium mb-1.5">Instructions</label>
                    <Textarea
                      value={form.instructions}
                      onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))}
                      placeholder="Tell the agent exactly how to think, what to ask, and how to respond…"
                      rows={7}
                      maxLength={4000}
                      autoFocus
                    />
                    <p className="text-[10.5px] text-muted-foreground/70 mt-1.5">
                      This is the agent's system prompt. Be specific — it shapes every reply.
                    </p>
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium mb-1.5">Expertise (Optional)</label>
                    <Input
                      value={form.expertise}
                      onChange={e => setForm(f => ({ ...f, expertise: e.target.value }))}
                      placeholder="Short scope, e.g. Growth strategy for early startups"
                      maxLength={300}
                    />
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-3">
                  <label className="block text-[12px] font-medium">Attach Knowledge Sources (Optional)</label>
                  {knowledgeSources.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border/60 p-4 text-center">
                      <p className="text-[11.5px] text-muted-foreground mb-2">
                        No Knowledge Sources yet.
                      </p>
                      <a href="/knowledge" className="text-[11.5px] text-primary hover:underline">
                        Add One In The Knowledge Workspace
                      </a>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-border/40 divide-y divide-border/30">
                      {knowledgeSources.map(k => (
                        <label key={k.id} className="flex items-center gap-3 px-3.5 py-2.5 cursor-pointer hover:bg-accent/30 transition-colors">
                          <Checkbox
                            checked={form.knowledge_source_ids.includes(k.id)}
                            onCheckedChange={() => toggleKnowledge(k.id)}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-[12.5px] truncate">{k.title}</div>
                            <div className="text-[10.5px] text-muted-foreground capitalize">{k.source_type}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="mt-5 text-[12px] text-destructive">{error}</div>
              )}

              <div className="flex items-center justify-end gap-2 mt-8">
                {step < STEP_LABELS.length - 1 ? (
                  <button
                    onClick={() => { setError(null); setStep(s => s + 1); }}
                    disabled={!canNext()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-primary-foreground text-[12px] font-medium hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next
                    <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
                  </button>
                ) : (
                  <button
                    onClick={submit}
                    disabled={creating || !canNext()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-primary-foreground text-[12px] font-medium hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {creating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2} />
                        Creating…
                      </>
                    ) : (
                      'Create Agent'
                    )}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}