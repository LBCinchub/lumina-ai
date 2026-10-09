import { Badge } from '@/components/ui/badge';

const STATUS_LABEL = {
  available: 'Executable',
  needs_connection: 'Needs Connection',
  needs_setup: 'Owner Setup Required',
  needs_permission: 'Plan Or Scope Required',
  blocked: 'Blocked',
  unsupported: 'Unsupported',
};
const STATUS_COLOR = {
  available: 'default',
  needs_connection: 'outline',
  needs_setup: 'outline',
  needs_permission: 'outline',
  blocked: 'secondary',
  unsupported: 'secondary',
};

export default function CapabilityMatrix({ capabilities, destinations }) {
  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground">What Autopilot Can Actually Do Right Now — No Guarantees Beyond This List.</div>
      <div className="grid gap-2 sm:grid-cols-2">
        {(capabilities || []).map(c => (
          <div key={c.id} className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">{c.label}</span>
              <Badge variant={STATUS_COLOR[c.status] || 'outline'}>{STATUS_LABEL[c.status] || c.status}</Badge>
            </div>
            <div className="text-xs text-muted-foreground mt-1">{c.reason || 'Fully Supported And Executed Server-Side.'}</div>
          </div>
        ))}
      </div>
      <div className="text-xs text-muted-foreground">Posting Destinations: {destinations?.length
        ? destinations.map(d => `${d.label} — ${STATUS_LABEL[d.status] || d.status}`).join(' · ')
        : 'None Configured'}</div>
    </div>
  );
}