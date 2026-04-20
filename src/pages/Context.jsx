import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import ContextField from '@/components/context/ContextField';
import DocumentLibrary from '@/components/context/DocumentLibrary';
import { Button } from '@/components/ui/button';
import { Check, Loader2 } from 'lucide-react';

const FIELDS = [
  {
    key: 'identity',
    label: 'Identity',
    hint: 'Who you are. Background, role, the shape of your work.',
    placeholder: 'Founder building at the intersection of…',
    rows: 4
  },
  {
    key: 'vision',
    label: 'Vision',
    hint: 'The long arc. What you\'re building toward.',
    placeholder: 'A unified ecosystem where…',
    rows: 4
  },
  {
    key: 'current_focus',
    label: 'Current focus',
    hint: 'What is actively taking your attention right now.',
    placeholder: 'Launching v2. Hiring a technical lead. Closing the seed round…',
    rows: 3
  },
  {
    key: 'values',
    label: 'Values',
    hint: 'The principles that shape how you decide.',
    placeholder: 'Efficiency without coldness. Depth over volume…',
    rows: 3
  },
  {
    key: 'communication_style',
    label: 'Communication style',
    hint: 'How you want Lumina to speak with you.',
    placeholder: 'Direct. Strategic. No hedging. Short paragraphs over lists when possible…',
    rows: 3
  },
  {
    key: 'context_notes',
    label: 'Additional context',
    hint: 'Anything else — relationships, constraints, ongoing threads.',
    placeholder: 'Based in Lisbon. Co-founder left last quarter. Thinking about…',
    rows: 5
  }
];

export default function Context() {
  const [ctx, setCtx] = useState({});
  const [ctxId, setCtxId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.UserContext.list().then(list => {
      if (list.length > 0) {
        setCtx(list[0]);
        setCtxId(list[0].id);
      }
      setLoading(false);
    });
  }, []);

  const handleChange = (key, value) => {
    setCtx(prev => ({ ...prev, [key]: value }));
    setSavedAt(null);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = FIELDS.reduce((acc, f) => ({ ...acc, [f.key]: ctx[f.key] || '' }), {});
    try {
      if (ctxId) {
        await base44.entities.UserContext.update(ctxId, payload);
      } else {
        const created = await base44.entities.UserContext.create(payload);
        setCtxId(created.id);
      }
      setSavedAt(Date.now());
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-3xl mx-auto px-6 md:px-10 py-12 md:py-20">
        <div className="mb-12 md:mb-16">
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3">
            Living memory
          </div>
          <h1 className="font-serif text-4xl md:text-5xl tracking-tight leading-[1.05] mb-4">
            The context that shapes every conversation.
          </h1>
          <p className="text-[15px] text-muted-foreground leading-relaxed max-w-xl">
            What you share here becomes the ground Lumina reasons from. No conversation starts from zero.
            Write plainly. Update whenever something shifts.
          </p>
        </div>

        <div className="space-y-10">
          {FIELDS.map(f => (
            <ContextField
              key={f.key}
              label={f.label}
              hint={f.hint}
              value={ctx[f.key]}
              onChange={(v) => handleChange(f.key, v)}
              placeholder={f.placeholder}
              rows={f.rows}
            />
          ))}
        </div>

        {/* Document Library */}
        <div className="mt-14 pt-10 border-t border-border">
          <div className="mb-6">
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
              Document library
            </div>
            <h2 className="font-serif text-2xl tracking-tight mb-2">Source documents</h2>
            <p className="text-[14px] text-muted-foreground leading-relaxed">
              Upload PDFs — reports, notes, briefs, research. Lumina will read them and reference them when answering.
            </p>
          </div>
          <DocumentLibrary />
        </div>

        <div className="sticky bottom-4 md:bottom-6 mt-12 flex items-center justify-between gap-4 bg-background/80 backdrop-blur-xl border border-border rounded-full px-5 py-2.5 shadow-[0_4px_30px_-10px_hsl(var(--foreground)/0.12)]">
          <div className="text-xs text-muted-foreground">
            {savedAt ? (
              <span className="flex items-center gap-1.5 text-foreground/70">
                <Check className="w-3.5 h-3.5" /> Saved
              </span>
            ) : (
              <span>Unsaved changes will be lost.</span>
            )}
          </div>
          <Button
            onClick={handleSave}
            disabled={saving}
            size="sm"
            className="rounded-full px-5"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
            Save context
          </Button>
        </div>
      </div>
    </div>
  );
}