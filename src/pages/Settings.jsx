import React from 'react';
import { Link } from 'react-router-dom';
import DevicesSection from '@/components/settings/DevicesSection';
import FaceIdSection from '@/components/biometric/FaceIdSection';
import GmailSection from '@/components/settings/GmailSection';
import MemorySection from '@/components/settings/MemorySection';

// Settings — account management for the signed-in LBC AI experience.
// Currently holds the Devices section.
export default function Settings() {
  return (
    <div className="flex-1 overflow-y-auto scrollbar-minimal">
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 space-y-6 animate-fade-up">
        <div>
          <h1 className="font-serif text-2xl tracking-tight">Settings</h1>
          <p className="text-[12px] text-muted-foreground mt-1">
            Manage Your LBC AI Account And Devices.
          </p>
        </div>
        <FaceIdSection />
        <DevicesSection />
        <GmailSection />
        <Link to="/github" className="block rounded-xl border border-border bg-card px-5 py-4 text-sm hover:bg-accent/40 transition-colors">
          <span className="font-medium">GitHub Connection</span>
          <span className="block text-[12px] text-muted-foreground mt-0.5">Connect Or Check Your Own GitHub Account.</span>
        </Link>
        <MemorySection />
      </div>
    </div>
  );
}