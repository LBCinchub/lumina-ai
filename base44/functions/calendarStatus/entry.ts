import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { fetchMeetings } from '../../shared/meetingContext.ts';

// Read-only status of the CALLER's own Google Calendar connection.
export default async function (req) {
  const base44 = createClientFromRequest(req);
  let user = null;
  try { user = await base44.auth.me(); } catch (_) {}
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const r = await fetchMeetings(base44);
  return Response.json({ state: r.status, count: r.events.length });
}