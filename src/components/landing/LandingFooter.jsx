import React from 'react';

const ECOSYSTEM_LINKS = [
  { label: 'HTTPS://LBCHUB.SITE', href: 'https://lbchub.site' },
  { label: 'HTTPS://LBC-HUB.COM', href: 'https://lbc-hub.com' },
  { label: 'HTTPS://LBC.NETWORK', href: 'https://lbc.network' },
  { label: 'HTTPS://LBCHUB.TECH', href: 'https://lbchub.tech' },
];

// Footer — LBC ecosystem links (displayed in capitals), the honest $LBC on
// Solana line, and copyright.
export default function LandingFooter() {
  return (
    <footer className="border-t border-white/5 py-12">
      <div className="max-w-6xl mx-auto px-5 text-center space-y-6">
        <p className="text-sm text-zinc-300">
          LBC AI Ultra — Part Of The LBC Ecosystem.
        </p>
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2" aria-label="LBC Ecosystem">
          {ECOSYSTEM_LINKS.map(link => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] tracking-wider text-zinc-500 hover:text-pink-400 transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <p className="text-xs text-zinc-500">
          Powered By LBC AI — The $LBC Token Lives On Solana.
        </p>
        <p className="text-[11px] text-zinc-600">
          Copyright 2026 LBC Network Inc.
        </p>
      </div>
    </footer>
  );
}