import React, { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import TwinRequestRow from '@/components/twin/TwinRequestRow';

const pendingFirst = (a, b) => (a.status === 'pending' ? 0 : 1) - (b.status === 'pending' ? 0 : 1);

// The user's own twin action requests. Pending ones wait for an explicit
// Approve or Deny, bound to the estimated cost shown; decided ones stay listed.
export default function TwinRequestQueue() {
  const [requests, setRequests] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await base44.functions.invoke('lbcTwinEngine', { action: 'list_requests' });
      setRequests(res.data?.requests || []);
    } catch (_) {
      setLoadError('Your Action Requests Could Not Be Loaded.');
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const decide = async (request, decision) => {
    setBusyId(request.id);
    setNotice(null);
    const replace = (next) => setRequests(rs => rs.map(r => (r.id === request.id ? next : r)));
    try {
      const res = await base44.functions.invoke('lbcTwinEngine', {
        action: 'decide_request', request_id: request.id, decision,
        expected_cost_usd: Number(request.estimated_cost_usd) || 0,
      });
      replace(res.data.request);
    } catch (e) {
      const data = e?.response?.data;
      if (data?.request) replace(data.request); // the server's current state
      setNotice(data?.error || 'That Decision Could Not Be Saved. Please Try Again.');
    } finally {
      setBusyId(null);
    }
  };

  if (loadError) {
    return (
      <div role="alert" className="text-sm text-destructive">
        {loadError} <Button variant="link" size="sm" className="h-auto p-0" onClick={load}>Try Again</Button>
      </div>
    );
  }
  if (!requests) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const waiting = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{waiting === 1 ? '1 Request Waits' : `${waiting} Requests Wait`} For Your Approval</p>
      {notice && <p role="alert" className="text-xs text-destructive">{notice}</p>}
      {requests.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-6 text-sm text-muted-foreground text-center">
          No Action Requests Yet. Requests Your Twin Proposes Wait Here For Your Approval.
        </p>
      ) : (
        <ul className="space-y-3">
          {[...requests].sort(pendingFirst).map(r => (
            <TwinRequestRow key={r.id} request={r} busy={busyId === r.id} onDecide={decide} />
          ))}
        </ul>
      )}
      <p className="text-[11px] text-muted-foreground">
        Approving Records Your Decision. No Ride, Travel Or Marketplace Provider Is Connected Yet, So Nothing Is Booked Or Charged.
      </p>
    </div>
  );
}