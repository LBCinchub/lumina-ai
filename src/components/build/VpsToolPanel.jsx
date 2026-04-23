import React from 'react';
import { Server, AlertCircle } from 'lucide-react';

export default function VpsToolPanel() {
  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 px-5 py-4 border-b border-border/60">
        <h2 className="font-serif text-lg tracking-tight">VPS Tools</h2>
      </div>
      <div className="flex-1 flex items-center justify-center px-5 py-12">
        <div className="text-center space-y-4 max-w-sm">
          <div className="flex justify-center">
            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
              <Server className="w-6 h-6 text-muted-foreground" />
            </div>
          </div>
          <div>
            <h3 className="font-medium text-foreground mb-1">VPS Management</h3>
            <p className="text-sm text-muted-foreground">
              Access full VPS controls on the dedicated VPS page.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}