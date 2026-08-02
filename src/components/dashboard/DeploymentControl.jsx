import React from 'react';
import DeployUnavailable from '@/components/deploy/DeployUnavailable';

// Legacy VPS deployment orchestrator — disabled. Renders the honest
// unavailable state instead of a button that can never complete.
export default function DeploymentControl() {
  return <DeployUnavailable />;
}