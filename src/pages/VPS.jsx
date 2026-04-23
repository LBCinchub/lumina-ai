import React from 'react';
import VPSPanel from '@/components/vps/VPSPanel';
import { Server } from 'lucide-react';

export default function VPS() {
  return (
    <div className="max-w-2xl mx-auto px-5 py-10">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Server className="w-6 h-6" />
          <h1 className="font-serif text-2xl font-medium">VPS Control</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Lumina's direct control panel for <strong>server1.lbc.network</strong> — monitor status, reboot, shutdown, and more.
        </p>
      </div>
      <VPSPanel />
    </div>
  );
}