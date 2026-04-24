import React from 'react';
import VPSPanel from '@/components/vps/VPSPanel';

export default function VpsToolPanel() {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <VPSPanel server={null} />
    </div>
  );
}