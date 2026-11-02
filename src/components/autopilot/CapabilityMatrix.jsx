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

// Per-user view: a capability the user cannot run right now shows the
// substitute Autopilot uses on their plan, or why it cannot run.
function view(c) {
  if (c.status !== 'available') return [STATUS_LABEL[c.status] || c.status, STATUS_COLOR[c.status] || 'outline', c.reason];
  if (c.fallback) return ['Fallback On Your Plan', 'outline', `${c.blocker} ${c.fallback}`];
  if (c.blocker) return ['Not Available Now', 'outline', c.blocker];
  return [STATUS_LABEL.available, STATUS_COLOR.available, c.reason || 'Fully Supported And Executed Server-Side.'];
}

export default function CapabilityMatrix({ capabilities, destinations }) {
  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground">What Autopilot Can Actually Do Right Now — No Guarantees Beyond This List.</div>
      <div className="grid gap-2 sm:grid-cols-2">
        {(capabilities || []).map(c => {
          const [label, color, text] = view(c);
          return (
            <div key={c.id} className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{c.label}</span>
                <Badge variant={color}>{label}</Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-1">{text}</div>
            </div>
          );
        })}
      </div>
      <div className="text-xs text-muted-foreground">Posting Destinations: {destinations?.length
        ? destinations.map(d => `${d.label} — ${STATUS_LABEL[d.status] || d.status}`).join(' · ')
        : 'None Configured'}</div>
    </div>
  );
}