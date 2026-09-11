import React from 'react';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: '',
    features: ['1 LBC AI Agent', 'Limited Daily Messages', '1 Autopilot Task'],
    cta: 'Get Started Free',
    highlight: false,
    badge: null,
  },
  {
    name: 'LBC AI Superagent',
    price: '$40',
    period: '/Month',
    features: [
      'Up To 10 Agents',
      'Phone Connect Through Telegram',
      'Expanded Autopilot',
      'Expanded Memory',
    ],
    cta: 'Choose Superagent',
    highlight: true,
    badge: 'Most Popular',
  },
  {
    name: 'LBC AI Ultra',
    price: '$100',
    period: '/Month',
    features: [
      'Everything In Superagent',
      'All Workspaces — Chat, Build, Knowledge, Projects',
      'The Highest Limits',
      'Priority AI',
    ],
    cta: 'Choose Ultra',
    highlight: false,
    badge: 'Full Access',
  },
];

// Pricing — three plan cards. The Free CTA goes to real signup; paid CTAs open
// the honest early-access dialog — payments are NOT connected yet, so nothing
// ever simulates a checkout.
export default function LandingPricing({ onChoosePlan }) {
  return (
    <section id="pricing" className="py-20 md:py-28 border-t border-white/5">
      <div className="max-w-6xl mx-auto px-5">
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-center">
          Simple, Honest Pricing
        </h2>
        <p className="mt-4 text-zinc-400 text-center max-w-xl mx-auto leading-relaxed">
          Start Free Today. Paid Plans Activate Soon.
        </p>

        <div className="mt-12 grid gap-4 md:grid-cols-3 md:gap-6 items-stretch">
          {PLANS.map(plan => (
            <article
              key={plan.name}
              className={cn(
                'relative flex flex-col rounded-2xl p-6',
                plan.highlight
                  ? 'border border-pink-500/40 bg-gradient-to-b from-pink-500/10 to-purple-600/10 shadow-[0_0_40px_rgba(236,72,153,0.15)]'
                  : 'border border-white/5 bg-white/[0.02]'
              )}
            >
              {plan.badge && (
                <span
                  className={cn(
                    'absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap',
                    plan.highlight
                      ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white'
                      : 'border border-purple-500/40 bg-zinc-950 text-purple-300'
                  )}
                >
                  {plan.badge}
                </span>
              )}
              <h3 className="font-medium text-zinc-200">{plan.name}</h3>
              <p className="mt-3">
                <span className="text-3xl font-semibold">{plan.price}</span>
                {plan.period && <span className="ml-1 text-sm text-zinc-500">{plan.period}</span>}
              </p>
              <ul className="mt-5 flex-1 space-y-2.5">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-zinc-300 leading-relaxed">
                    <svg className="w-4 h-4 mt-0.5 shrink-0 text-pink-400" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M3 8.5l3.2 3.2L13 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => plan.name === 'Free'
                  ? base44.auth.redirectToLogin()
                  : onChoosePlan(plan.name)}
                className={cn(
                  'mt-6 w-full py-2.5 rounded-full text-sm font-medium transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400',
                  plan.highlight
                    ? 'text-white bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-90'
                    : 'text-zinc-100 border border-white/15 hover:border-white/30'
                )}
              >
                {plan.cta}
              </button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}