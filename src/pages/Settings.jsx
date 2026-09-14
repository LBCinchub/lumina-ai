import React from 'react';
import DevicesSection from '@/components/settings/DevicesSection';

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
        <DevicesSection />
      </div>
    </div>
  );
}