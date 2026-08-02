import React from 'react';
import DeployUnavailable from './DeployUnavailable';

// Legacy deployment trigger — disabled. Renders the honest unavailable
// state instead of buttons that can never complete.
export default function DeploymentTrigger() {
  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h2 className="font-serif text-xl tracking-tight mb-2">Production Deployment</h2>
      </div>
      <DeployUnavailable />
    </div>
  );
}