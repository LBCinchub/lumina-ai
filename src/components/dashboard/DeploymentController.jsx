import React from 'react';
import DeployUnavailable from '@/components/deploy/DeployUnavailable';

// Legacy VPS orchestration pipeline — disabled. Renders the honest
// unavailable state instead of a button that can never complete.
export default function DeploymentController() {
  return <DeployUnavailable />;
}