import React from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import TwinProfileDetails from '@/components/twin/TwinProfileDetails';
import TwinAuthForm from '@/components/twin/TwinAuthForm';
import TwinRequestQueue from '@/components/twin/TwinRequestQueue';
import { useTwinProfile } from '@/hooks/useTwinProfile';

const CARD = 'rounded-xl border border-border bg-card p-4 md:p-5';

// The user's own twin: what it has learned, what it may do, and the actions
// waiting for their explicit approval.
export default function Twin() {
  const { profile, settings, loading, error, reload, setStyle } = useTwinProfile();
  // Settings are never shown before they load, so defaults can't be saved over them.
  const notReady = loading ? <p className="text-sm text-muted-foreground">Loading…</p> : error ? (
    <div role="alert" className="text-sm text-destructive">
      {error} <Button variant="link" size="sm" className="h-auto p-0" onClick={reload}>Try Again</Button>
    </div>
  ) : null;

  return (
    <div className="flex-1 overflow-y-auto scrollbar-minimal">
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 space-y-6">
        <PageHeader
          title="My Twin"
          description="What Your Twin Has Learned, What It May Do For You, And The Actions Waiting For Your Approval."
        />
        <section aria-labelledby="twin-profile" className={CARD}>
          <h2 id="twin-profile" className="text-sm font-medium mb-3">Profile</h2>
          {notReady || <TwinProfileDetails profile={profile} onStyle={setStyle} traitLimit={10} />}
        </section>
        <section aria-labelledby="twin-auth" className={CARD}>
          <h2 id="twin-auth" className="text-sm font-medium">Authorization</h2>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            Financial Actions Always Need Your Explicit Approval, Whatever These Settings Say.
          </p>
          {notReady || <TwinAuthForm settings={settings} />}
        </section>
        <section aria-labelledby="twin-requests" className={CARD}>
          <h2 id="twin-requests" className="text-sm font-medium mb-3">Action Requests</h2>
          <TwinRequestQueue />
        </section>
      </div>
    </div>
  );
}