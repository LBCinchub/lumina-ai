// LBC AI first-party plugin registry. Closed, reviewed, versioned manifests
// that bundle EXISTING allowlisted capabilities. No remote manifests, no
// uploaded code, no client- or model-supplied handlers. Server-side only.
import { sha256Hex } from './hash.ts';
import { REGISTRY } from './autopilotRegistry.ts';
import { GMAIL_CONNECTOR_ID } from './autopilotActions.ts';
import { CALENDAR_CONNECTOR_ID } from './meetingContext.ts';

// Capabilities a plugin may bundle, each with its verified implementation.
export const PLUGIN_CAPABILITIES: Record<string, { label: string; impl: string }> = {
  'research.web': { label: REGISTRY['research.web'].label, impl: 'Core.InvokeLLM live web (chat path)' },
  'analyze.documents': { label: REGISTRY['analyze.documents'].label, impl: 'Owner-filtered Document read + Core.InvokeLLM' },
  'plan.breakdown': { label: REGISTRY['plan.breakdown'].label, impl: 'Core.InvokeLLM planning (no writes)' },
  'calendar.read': { label: 'Read Your Calendar Events', impl: 'shared/meetingContext.fetchMeetings (current user connection)' },
  'email.read': { label: REGISTRY['email.read'].label, impl: 'shared/gmailChatRead.handleGmailRead (unchanged)' },
};

export const CONNECTIONS: Record<string, { label: string; connector_id: string }> = {
  gmail: { label: 'Gmail', connector_id: GMAIL_CONNECTOR_ID },
  google_calendar: { label: 'Google Calendar', connector_id: CALENDAR_CONNECTOR_ID },
};

const base = { publisher: 'LBC', status: 'available', connection: null as string | null };
export const PLUGINS: Record<string, any> = Object.freeze({
  'research-briefs': { ...base, id: 'research-briefs', version: '1.0.0', title: 'Research Briefs',
    description: 'Turns A Question Into A Short Research Brief Grounded In Live Web Sources With Named Citations.',
    capabilities: ['research.web'], min_plan: 'superagent', risk: 'read',
    permissions: ['Search The Public Web', 'No Access To Your Accounts'], inputs: 'A Research Question' },
  'document-analysis': { ...base, id: 'document-analysis', version: '1.0.0', title: 'Document Analysis',
    description: 'Analyzes Up To 5 Of Your Own Ready Documents. Document Text Is Treated As Data, Never Instructions.',
    capabilities: ['analyze.documents'], min_plan: 'superagent', risk: 'read',
    permissions: ['Read Your Own Ready Documents', 'No Changes To Documents'], inputs: 'What To Analyze' },
  'project-planning': { ...base, id: 'project-planning', version: '1.0.0', title: 'Project Planning',
    description: 'Breaks A Goal Into Milestones, Steps And Risks. Shows A Plan Only; Use To Tasks To Save Tasks.',
    capabilities: ['plan.breakdown'], min_plan: 'free', risk: 'draft',
    permissions: ['Generate A Plan In Chat', 'Never Creates Or Changes Records'], inputs: 'A Goal Or Project' },
  'meeting-prep': { ...base, id: 'meeting-prep', version: '1.0.0', title: 'Meeting Prep',
    description: 'Prepares Talking Points From Your Recent And Upcoming Calendar Meetings.',
    capabilities: ['calendar.read'], min_plan: 'free', risk: 'read', connection: 'google_calendar',
    permissions: ['Read Events From Your Own Connected Google Calendar (Last 7 Days, Next 2 Days)', 'No Calendar Changes'], inputs: 'What To Prepare For' },
  'gmail-inbox-brief': { ...base, id: 'gmail-inbox-brief', version: '1.0.0', title: 'Gmail Inbox Brief',
    description: 'A Read-Only Summary Of Your Most Recent Inbox Emails Using Your Own Connected Gmail.',
    capabilities: ['email.read'], min_plan: 'ultra', risk: 'read', connection: 'gmail',
    permissions: ['Read Recent Messages In Your Own Connected Gmail', 'Never Sends, Labels Or Deletes'], inputs: 'Optional Focus' },
  'social-publisher': { ...base, id: 'social-publisher', version: '1.0.0', title: 'Social Publisher', status: 'unavailable',
    description: 'Publishing Social Posts.', capabilities: [], min_plan: 'superagent', risk: 'external_write', permissions: [], inputs: '',
    reason: 'Unavailable: No Social Destination Can Be Connected In LBC AI Yet. Nothing Is Simulated.' },
  'office-export': { ...base, id: 'office-export', version: '1.0.0', title: 'Office Export', status: 'unavailable',
    description: 'Export To PPTX, XLSX Or PDF.', capabilities: [], min_plan: 'superagent', risk: 'generate', permissions: [], inputs: '',
    reason: 'Unavailable: No File Exporter Is Implemented Yet.' },
});

export const getPlugin = (id: any) => (typeof id === 'string' && Object.prototype.hasOwnProperty.call(PLUGINS, id) ? PLUGINS[id] : null);

// A manifest is valid only if every capability is allowlisted and every
// connection is known. Anything else fails closed.
export function manifestValid(m: any) {
  return !!m && m.publisher === 'LBC' && Array.isArray(m.capabilities)
    && m.capabilities.every((c: string) => Object.prototype.hasOwnProperty.call(PLUGIN_CAPABILITIES, c))
    && (m.connection === null || Object.prototype.hasOwnProperty.call(CONNECTIONS, m.connection));
}

// Consent is bound to the exact permission set; any change needs fresh consent.
export function permissionHash(m: any) {
  const canon = JSON.stringify({ id: m.id, capabilities: [...m.capabilities].sort(), min_plan: m.min_plan, connection: m.connection, permissions: m.permissions, risk: m.risk });
  return sha256Hex(canon);
}

export function resolvePluginName(name: string) {
  const n = String(name || '').toLowerCase().replace(/[^a-z0-9 -]/g, '').replace(/\s+plugin$/, '').trim();
  return Object.values(PLUGINS).find((p: any) => p.id === n || p.title.toLowerCase() === n || p.id === n.replace(/\s+/g, '-')) || null;
}

export function publicManifest(m: any) {
  return {
    id: m.id, version: m.version, title: m.title, description: m.description, publisher: m.publisher,
    status: m.status, reason: m.reason || null, risk: m.risk, min_plan: m.min_plan, inputs: m.inputs,
    permissions: m.permissions, capabilities: m.capabilities.map((c: string) => PLUGIN_CAPABILITIES[c].label),
    connection: m.connection ? CONNECTIONS[m.connection].label : null,
  };
}