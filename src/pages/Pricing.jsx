import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Check, X, Zap, Crown, Loader2, Mail, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

// Official LBC AI pricing. Brand: LBC AI everywhere — Solana / $LBC is the
// only external brand (the ecosystem's payment layer). No payment provider
// is connected yet, so every upgrade CTA is honest: it opens the
// Payment Activation Coming Soon dialog and collects an early-access email.
// Payment success is never simulated.

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: 'Forever',
    tagline: 'Meet LBC AI',
    features: [
      '1 LBC AI Agent',
      '20 Daily Messages',
      '1 Autopilot Task',
      'Chat Workspace',
      'Personal Context',
    ],
    featured: false,
    cta: 'Your Current Plan',
  },
  {
    id: 'superagent',
    name: 'LBC AI Superagent',
    price: '$40',
    period: 'Per Month',
    tagline: 'Your AI, On Your Phone',
    features: [
      'Everything In Free',
      'Up To 10 LBC AI Agents',
      'Phone Connect — Telegram',
      'More Autopilot Tasks',
      'Expanded Memory',
      'Knowledge + Projects Workspaces',
    ],
    featured: false,
    cta: 'Upgrade To Superagent',
  },
  {
    id: 'ultra',
    name: 'LBC AI Ultra',
    price: '$100',
    period: 'Per Month',
    tagline: 'Full Access',
    features: [
      'Everything In Superagent',
      'All Workspaces — Chat, Build, Knowledge, Projects',
      'Highest Limits',
      'Priority AI',
    ],
    featured: true,
    cta: 'Upgrade To Ultra',
  },
];

const COMPARISON_ROWS = [
  { label: 'LBC AI Agents', values: ['1', 'Up To 10', 'Highest Limits'] },
  { label: 'Daily Messages', values: ['20', 'Expanded', 'Highest Limits'] },
  { label: 'Autopilot Tasks', values: ['1', 'More', 'Highest Limits'] },
  { label: 'Phone Connect — Telegram', values: [false, true, true] },
  { label: 'Workspaces', values: ['Chat', 'Chat + Knowledge + Projects', 'All Workspaces'] },
  { label: 'Priority AI', values: [false, false, true] },
];

export default function Pricing() {
  const [dialogPlan, setDialogPlan] = useState(null);
  const [email, setEmail] = useState('');
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [joinError, setJoinError] = useState(null);

  useEffect(() => {
    base44.auth.me()
      .then(u => { if (u?.email) setEmail(u.email); })
      .catch(() => {});
  }, []);

  const openUpgradeDialog = (plan) => {
    setDialogPlan(plan);
    setJoined(false);
    setJoinError(null);
  };

  const handleJoinEarlyAccess = async () => {
    const trimmed = email.trim();
    if (!trimmed || joining) return;
    setJoining(true);
    setJoinError(null);
    try {
      await base44.entities.EarlyAccessInterest.create({ email: trimmed, plan: dialogPlan.name });
      setJoined(true);
    } catch (_) {
      setJoinError('Could Not Save Your Email — Please Try Again.');
    }
    setJoining(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-6 md:px-10 py-12 md:py-16">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-pink-500 mb-3">
            <Sparkles className="w-3.5 h-3.5" strokeWidth={2} />
            LBC AI Pricing
          </div>
          <h1 className="font-serif text-4xl md:text-5xl tracking-tight leading-[1.05] mb-4">
            One Mind. Three Levels.
          </h1>
          <p className="text-[15px] text-muted-foreground max-w-xl mx-auto">
            Start Free With Your Own LBC AI Agent. Go Superagent To Reach It From Your Phone. Go Ultra For Full Access.
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-5 mb-14">
          {PLANS.map(plan => (
            <div
              key={plan.id}
              className={cn(
                "rounded-2xl border p-7 flex flex-col relative",
                plan.featured
                  ? "border-transparent bg-card md:-mt-3 md:mb-3"
                  : "border-border bg-card/40"
              )}
              style={plan.featured ? { borderWidth: 1.5, borderImage: 'linear-gradient(135deg, #ec4899, #9333ea) 1' } : undefined}
            >
              {plan.featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white text-[10.5px] font-semibold uppercase tracking-wider inline-flex items-center gap-1">
                  <Crown className="w-3 h-3" strokeWidth={2} />
                  Most Powerful
                </span>
              )}
              <div className="mb-5">
                <h2 className="font-serif text-xl tracking-tight mb-1">{plan.name}</h2>
                <p className="text-[12.5px] text-muted-foreground">{plan.tagline}</p>
              </div>
              <div className="mb-6 flex items-baseline gap-2">
                <span className="text-4xl font-medium tracking-tight">{plan.price}</span>
                <span className="text-[12px] text-muted-foreground">{plan.period}</span>
              </div>
              <ul className="space-y-2.5 mb-8 flex-1">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-pink-500 shrink-0 mt-0.5" strokeWidth={2.5} />
                    <span className="text-[13px] leading-relaxed">{f}</span>
                  </li>
                ))}
              </ul>
              {plan.id === 'free' ? (
                <Button variant="outline" className="w-full rounded-full" disabled>
                  {plan.cta}
                </Button>
              ) : (
                <Button
                  onClick={() => openUpgradeDialog(plan)}
                  className={cn(
                    "w-full rounded-full inline-flex items-center justify-center gap-1.5",
                    plan.featured
                      ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:opacity-90 border-0"
                      : "bg-foreground text-background hover:bg-foreground/90"
                  )}
                >
                  <Zap className="w-3.5 h-3.5" strokeWidth={2.5} />
                  {plan.cta}
                </Button>
              )}
            </div>
          ))}
        </div>

        {/* Plan Comparison */}
        <div className="rounded-2xl border border-border bg-card/40 overflow-hidden mb-14">
          <div className="px-6 md:px-8 py-5 border-b border-border">
            <h3 className="font-serif text-lg tracking-tight">Compare Plans</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="text-left font-medium px-6 md:px-8 py-3.5 text-muted-foreground">&nbsp;</th>
                  {PLANS.map(p => (
                    <th key={p.id} className="text-left font-medium px-4 md:px-6 py-3.5 whitespace-nowrap">
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row, ri) => (
                  <tr key={ri} className="border-b border-border/30 last:border-0">
                    <td className="px-6 md:px-8 py-3.5 text-muted-foreground">{row.label}</td>
                    {row.values.map((v, vi) => (
                      <td key={vi} className="px-4 md:px-6 py-3.5">
                        {v === true ? (
                          <Check className="w-4 h-4 text-pink-500" strokeWidth={2.5} />
                        ) : v === false ? (
                          <X className="w-4 h-4 text-muted-foreground/40" strokeWidth={2} />
                        ) : (
                          <span>{v}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer — Solana / $LBC */}
        <div className="text-center max-w-xl mx-auto px-4">
          <p className="text-[12px] text-muted-foreground leading-relaxed">
            Solana Is The LBC Ecosystem's Payment Layer — Settle In $LBC On Solana When Payment Activation Goes Live.
          </p>
        </div>
      </div>

      {/* Honest upgrade dialog — no simulated payment */}
      <Dialog open={!!dialogPlan} onOpenChange={(open) => { if (!open) setDialogPlan(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payment Activation Coming Soon</DialogTitle>
            <DialogDescription>
              {dialogPlan && `Card Checkout For ${dialogPlan.name} Is Not Live Yet — No Payment Will Be Taken Today. Join The Early Access List And Be First In Line When It Launches.`}
            </DialogDescription>
          </DialogHeader>
          {joined ? (
            <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-[13px] text-foreground/80">
              You're On The Early Access List For {dialogPlan?.name}. We'll Email You When Payment Activation Goes Live.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3.5 py-2.5">
                <Mail className="w-4 h-4 text-muted-foreground shrink-0" strokeWidth={1.75} />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Your Email"
                  className="flex-1 bg-transparent text-[13px] outline-none"
                />
              </div>
              {joinError && <p className="text-[12px] text-destructive">{joinError}</p>}
              <Button
                onClick={handleJoinEarlyAccess}
                disabled={!email.trim() || joining}
                className="w-full rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:opacity-90 border-0 inline-flex items-center justify-center gap-1.5"
              >
                {joining && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Join Early Access
              </Button>
              <p className="text-[11px] text-muted-foreground/70 text-center leading-relaxed">
                This Saves Your Email Only — It Does Not Purchase Anything.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}