import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { serverDate } from '@/lib/utils';

const VERTICAL_LABEL = { ride_booking: 'Ride Booking', marketplace_listing: 'Marketplace Listing', travel_booking: 'Travel Booking' };
const STATUS = {
  pending: ['Needs Approval', 'default'],
  confirmed: ['Approved', 'secondary'],
  denied: ['Denied', 'outline'],
  executed: ['Completed', 'secondary'],
};
const usd = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

// One twin action request: what it is, its estimated cost and status, and for
// a pending one an explicit Approve (showing the cost) or Deny.
export default function TwinRequestRow({ request, busy, onDecide }) {
  const [label, variant] = STATUS[request.status] || [request.status, 'outline'];
  const cost = Number(request.estimated_cost_usd) || 0;
  return (
    <li className="rounded-lg border border-border p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] text-muted-foreground">
            {VERTICAL_LABEL[request.vertical] || request.vertical} · {formatDistanceToNow(serverDate(request.created_date), { addSuffix: true })}
          </p>
          <p className="text-sm mt-0.5 break-words">{request.summary}</p>
        </div>
        <Badge variant={variant} className="shrink-0">{label}</Badge>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Estimated Cost: <span className="font-medium text-foreground">{usd(cost)}</span>
      </p>
      {request.status === 'pending' && (
        <div className="flex flex-wrap gap-2 mt-3">
          <Button size="sm" disabled={busy} onClick={() => onDecide(request, 'approve')}>
            {cost > 0 ? `Approve ${usd(cost)}` : 'Approve'}
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => onDecide(request, 'deny')}>Deny</Button>
        </div>
      )}
    </li>
  );
}