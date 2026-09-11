import React from 'react';
import { base44 } from '@/api/base44Client';

// Landing navbar — LBC AI Ultra wordmark, anchor links, and the primary
// signup CTA. Fixed with a translucent dark backdrop.
export default function LandingNavbar() {
  return (
    <header className="fixed top-0 inset-x-0 z-40 border-b border-white/5 bg-zinc-950/80 backdrop-blur-xl">
      <nav className="max-w-6xl mx-auto flex items-center justify-between px-5 h-16" aria-label="Main">
        <a href="#top" className="flex items-center gap-2.5" aria-label="LBC AI Ultra — Home">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm" aria-hidden="true">
            L
          </span>
          <span className="font-semibold tracking-wide text-sm md:text-base">LBC AI ULTRA</span>
        </a>
        <div className="flex items-center gap-1 md:gap-6">
          <a href="#features" className="hidden sm:inline-block px-2 py-2 text-sm text-zinc-400 hover:text-white transition-colors">
            Features
          </a>
          <a href="#pricing" className="hidden sm:inline-block px-2 py-2 text-sm text-zinc-400 hover:text-white transition-colors">
            Pricing
          </a>
          <button
            onClick={() => base44.auth.redirectToLogin()}
            className="ml-1 md:ml-2 px-4 py-2 rounded-full text-sm font-medium text-white bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
          >
            Get Started Free
          </button>
        </div>
      </nav>
    </header>
  );
}