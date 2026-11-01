import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

const TIERS = [
  { id: 'standard', label: 'Live Web (Default)', hint: 'Fast Answers Grounded In Live Web Search On Paid Plans. On Free, Answers Already Use The Highest Tier.' },
  { id: 'highest', label: 'Highest Tier', hint: "Every Chat Answer Comes From LBC AI's Highest Model Tier. Slower, And Answers Skip Live Web Search." },
];
const norm = (v) => (v === 'highest' ? 'highest' : 'standard');

// Saved on the user's own account. The chat server honors only 'highest';
// any other value falls back to the default.
export default function ModelTierSelector() {
  const [tier, setTier] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    base44.auth.me()
      .then(u => setTier(norm(u?.ai_model_tier)))
      .catch(() => setError('Could Not Load Your Model Tier.'));
  }, []);

  const save = async (next) => {
    setSaving(true); setError('');
    try {
      const u = await base44.auth.updateMe({ ai_model_tier: next });
      setTier(norm(u?.ai_model_tier ?? next));
    } catch (_) {
      setError('Could Not Save Your Model Tier. Your Previous Setting Is Kept.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-sm font-medium">Model Tier</div>
      {tier === null && !error && <div className="text-xs text-muted-foreground mt-1.5">Loading…</div>}
      {tier !== null && (
        <RadioGroup value={tier} onValueChange={save} disabled={saving} aria-label="Model Tier" className="mt-3 gap-3">
          {TIERS.map(t => (
            <div key={t.id} className="flex items-start gap-3">
              <RadioGroupItem id={`tier-${t.id}`} value={t.id} className="mt-0.5" />
              <Label htmlFor={`tier-${t.id}`} className="font-normal leading-snug cursor-pointer">
                <span className="text-sm font-medium">{t.label}</span>
                <span className="block text-xs text-muted-foreground mt-0.5">{t.hint}</span>
              </Label>
            </div>
          ))}
        </RadioGroup>
      )}
      <p className="text-[11px] text-muted-foreground mt-3">Autopilot Already Uses The Highest Tier For Planning, Drafts And Documents.</p>
      {saving && <div className="text-[11px] text-muted-foreground mt-1" aria-live="polite">Saving…</div>}
      {error && <div role="alert" className="text-[11px] text-destructive mt-1">{error}</div>}
    </div>
  );
}