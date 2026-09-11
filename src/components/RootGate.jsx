import React from 'react';
import { useAuth } from '@/lib/AuthContext';
import Landing from '@/pages/Landing';
import AppShell from '@/components/layout/AppShell';
import Converse from '@/pages/Converse';

// Root gate — signed-out visitors see the public landing page; signed-in
// users skip it and go straight into their chat inside the app shell.
export default function RootGate() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated
    ? <AppShell><Converse /></AppShell>
    : <Landing />;
}