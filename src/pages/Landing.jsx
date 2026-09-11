import React, { useState } from 'react';
import LandingNavbar from '@/components/landing/LandingNavbar';
import LandingHero from '@/components/landing/LandingHero';
import LandingFeatures from '@/components/landing/LandingFeatures';
import LandingHowItWorks from '@/components/landing/LandingHowItWorks';
import LandingPricing from '@/components/landing/LandingPricing';
import LandingFooter from '@/components/landing/LandingFooter';
import EarlyAccessDialog from '@/components/landing/EarlyAccessDialog';

// Public landing page for signed-out visitors at the app root.
// Premium, restrained, dark — hot pink + purple LBC brand accents.
// Only the LBC brand appears here; the $LBC token on Solana is the single
// external mention. Every claim is true today — no fabricated metrics.
export default function Landing() {
  const [earlyAccessPlan, setEarlyAccessPlan] = useState(null);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans antialiased selection:bg-pink-500/30">
      <LandingNavbar />
      <main>
        <LandingHero />
        <LandingFeatures />
        <LandingHowItWorks />
        <LandingPricing onChoosePlan={setEarlyAccessPlan} />
      </main>
      <LandingFooter />
      {earlyAccessPlan && (
        <EarlyAccessDialog plan={earlyAccessPlan} onClose={() => setEarlyAccessPlan(null)} />
      )}
    </div>
  );
}