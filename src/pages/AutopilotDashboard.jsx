import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Loader2, Plus } from 'lucide-react';
import { useAutopilotDashboard } from '@/hooks/useAutopilotDashboard';
import StatusSummary from '@/components/autopilot/dashboard/StatusSummary';
import ActiveRuns from '@/components/autopilot/dashboard/ActiveRuns';
import ActivityFeed from '@/components/autopilot/dashboard/ActivityFeed';

export default function AutopilotDashboard() {
  const { counts, active, recent, loading } = useAutopilotDashboard();

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-medium tracking-tight">Autopilot Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Every task's status and latest activity, live.</p>
        </div>
        <Button asChild><Link to="/autopilot"><Plus /> New Task</Link></Button>
      </div>
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          <StatusSummary counts={counts} />
          <div className="grid lg:grid-cols-5 gap-6">
            <section className="lg:col-span-3 space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">Active Tasks</h2>
              <ActiveRuns runs={active} />
            </section>
            <section className="lg:col-span-2 space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">Recent Activity</h2>
              <ActivityFeed runs={recent} />
            </section>
          </div>
        </>
      )}
    </div>
  );
}