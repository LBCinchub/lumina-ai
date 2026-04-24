import React from 'react';
import VPSPanel from '@/components/vps/VPSPanel';

export default function VpsToolPanel() {
  return (
    <div className="flex-1 overflow-y-auto scrollbar-minimal p-5">
      <VPSPanel />
    </div>
  );
}