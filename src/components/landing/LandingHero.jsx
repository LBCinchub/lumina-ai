import React from 'react';
import { base44 } from '@/api/base44Client';
import ChatPreview from './ChatPreview';

// Hero — headline, subheadline, both CTAs, and the product preview mock.
// Soft pink/purple glows behind restrained dark content.
export default function LandingHero() {
  return (
    <section id="top" className="relative overflow-hidden pt-32 pb-20 md:pt-40 md:pb-28">
      {/* Ambient brand glows */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-40 w-[480px] h-[480px] rounded-full bg-pink-600/20 blur-[120px]" />
        <div className="absolute top-20 -right-40 w-[480px] h-[480px] rounded-full bg-purple-600/20 blur-[120px]" />
      </div>

      <div className="relative max-w-6xl mx-auto px-5 grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-10">
        <div className="text-center lg:text-left">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight leading-[1.08]">
            Build Your Own{' '}
            <span className="bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
              AI Agent.
            </span>
          </h1>
          <p className="mt-6 text-base md:text-lg text-zinc-400 leading-relaxed max-w-xl mx-auto lg:mx-0">
            Create A Private AI Agent With Its Own Personality, Knowledge, And Voice — Chat With It Anywhere, Even On Your Phone Through Telegram.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
            <button
              onClick={() => base44.auth.redirectToLogin()}
              className="w-full sm:w-auto px-6 py-3 rounded-full text-sm font-medium text-white bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
            >
              Get Started Free
            </button>
            <a
              href="#pricing"
              className="w-full sm:w-auto px-6 py-3 rounded-full text-sm font-medium text-zinc-200 border border-white/15 hover:border-white/30 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              View Plans
            </a>
          </div>
        </div>

        <ChatPreview />
      </div>
    </section>
  );
}