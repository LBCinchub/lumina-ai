import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import BrandLogo from '@/components/brand/BrandLogo';
import PolicySection from '@/components/privacy/PolicySection';
import { INTRO, LAST_UPDATED, POLICY_SECTIONS } from '@/components/privacy/policySections';

// Public privacy policy: readable whether or not the visitor is signed in.
export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 text-sm font-medium">
            <BrandLogo size={28} /> LBC AI
          </Link>
          <Link to="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back To LBC AI
          </Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-5 py-12 md:py-16">
        <h1 className="font-serif text-4xl md:text-5xl tracking-tight">Privacy Policy</h1>
        <p className="mt-3 text-sm text-muted-foreground">Last Updated: {LAST_UPDATED}</p>
        <p className="mt-6 text-[15px] leading-relaxed text-muted-foreground">{INTRO}</p>
        <div className="mt-12 space-y-10">
          {POLICY_SECTIONS.map((s) => <PolicySection key={s.title} section={s} />)}
        </div>
      </main>
    </div>
  );
}