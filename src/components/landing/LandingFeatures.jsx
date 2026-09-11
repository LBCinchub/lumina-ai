import React from 'react';
import { Bot, MessageSquare, Smartphone, Image, Zap, LayoutGrid } from 'lucide-react';

const FEATURES = [
  {
    icon: Bot,
    title: 'Build Your Own Agent',
    description: 'Give It A Name, Personality, Voice, Instructions, And Knowledge. It Is Yours Alone, Private And Secure.',
  },
  {
    icon: MessageSquare,
    title: 'Chat Anywhere',
    description: 'Talk To Your Agent In The App, With Full Conversation Memory — It Remembers Your Whole Thread.',
  },
  {
    icon: Smartphone,
    title: 'Phone Connect',
    description: 'Message Your Agent On Telegram Right From Your Phone. WhatsApp Coming Soon.',
  },
  {
    icon: Image,
    title: 'Image Generation',
    description: 'Ask Your Agent To Create Images Right Inside The Chat — Rendered As Real Pictures, Never Code.',
  },
  {
    icon: Zap,
    title: 'Autopilot',
    description: 'Give Your Agent Recurring Tasks So It Works For You Around The Clock.',
  },
  {
    icon: LayoutGrid,
    title: 'Five Workspaces',
    description: 'Chat, Build, Knowledge, Projects, And Owner Operations — All In One Place.',
  },
];

// Features grid — six cards, one inline SVG icon each.
export default function LandingFeatures() {
  return (
    <section id="features" className="py-20 md:py-28 border-t border-white/5">
      <div className="max-w-6xl mx-auto px-5">
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-center">
          Everything Your Agent Needs
        </h2>
        <p className="mt-4 text-zinc-400 text-center max-w-xl mx-auto leading-relaxed">
          One Private Agent. Every Tool It Needs To Think, Create, And Work For You.
        </p>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(f => (
            <article
              key={f.title}
              className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 hover:border-pink-500/30 transition-colors"
            >
              <span className="inline-flex w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500/15 to-purple-600/15 border border-pink-500/20 items-center justify-center" aria-hidden="true">
                <f.icon className="w-5 h-5 text-pink-400" strokeWidth={1.75} />
              </span>
              <h3 className="mt-4 font-medium">{f.title}</h3>
              <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{f.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}