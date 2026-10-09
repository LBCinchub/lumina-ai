// LBC AI Autopilot capability registry — the ONLY list of step handlers the
// planner may choose from. Model output is constrained to these ids; anything
// else is rejected. Server-side only.
//
// status: available | needs_connection | needs_setup | needs_permission | blocked | unsupported
// risk: read | draft | generate | external_write | financial | destructive
// requires: 'gmail_connection' — the step additionally needs the owner's
//   connected Gmail token (foreground only).
// note: 'needs_user_session' — the step needs the owner online; background
//   workers pause instead of executing.

export const REGISTRY = {
  'research.web': {
    label: 'Live Web Research', status: 'available', risk: 'read', min_plan: 'superagent',
    confirmation: 'none', integration: 'Built-in Live Search', source: 'Public web (untrusted, cited)',
    input: 'research question (string)', output: 'answer + cited sources',
    timeout_ms: 60000, retries: 1, idempotent: true, verify: 'non-empty answer; sources recorded when found',
  },
  'analyze.documents': {
    label: 'Analyze Your Documents', status: 'available', risk: 'read', min_plan: 'superagent',
    confirmation: 'none', integration: 'Document Library', source: 'Owner-verified documents (untrusted content)',
    input: 'analysis instruction', output: 'analysis text',
    timeout_ms: 60000, retries: 1, idempotent: true, verify: 'non-empty analysis; requires attached owned documents',
  },
  'draft.content': {
    label: 'Draft Content', status: 'available', risk: 'draft', min_plan: 'free',
    confirmation: 'none', integration: 'LBC AI', source: 'Task context',
    input: 'what to draft', output: 'draft text (never sent anywhere)',
    timeout_ms: 60000, retries: 1, idempotent: true, verify: 'non-empty draft',
  },
  'plan.breakdown': {
    label: 'Plan And Break Down', status: 'available', risk: 'draft', min_plan: 'free',
    confirmation: 'none', integration: 'LBC AI', source: 'Task context',
    input: 'what to plan', output: 'structured plan text',
    timeout_ms: 60000, retries: 1, idempotent: true, verify: 'non-empty plan',
  },
  'document.generate': {
    label: 'Save As Document', status: 'available', risk: 'generate', min_plan: 'superagent',
    confirmation: 'none', integration: 'Document Library', source: 'Prior step outputs',
    input: 'document title + format (report, brief, slide outline)', output: 'Markdown document saved to your library',
    timeout_ms: 60000, retries: 1, idempotent: true, verify: 'saved record re-read and non-empty',
    note: 'needs_user_session',
  },
  'email.send': {
    label: 'Send Email (Your Gmail)', status: 'available', risk: 'external_write', min_plan: 'ultra',
    confirmation: 'exact_plan', integration: 'Gmail (Owner-Connected)', requires: 'gmail_connection',
    note: 'needs_user_session',
    reason: 'Uses Your Own Connected Gmail (Ultra). The Exact Message Is Previewed, And Nothing Is Sent Until You Approve It.',
  },
  'email.draft': {
    label: 'Save Draft To Gmail', status: 'available', risk: 'draft', min_plan: 'ultra',
    confirmation: 'none', integration: 'Gmail (Owner-Connected)', requires: 'gmail_connection',
    note: 'needs_user_session',
    reason: 'Saves A Reversible Draft To Your Gmail Drafts Folder. Nothing Is Ever Sent Without Approval.',
  },
  'email.read': {
    label: 'Read And Summarize Inbox', status: 'available', risk: 'read', min_plan: 'ultra',
    confirmation: 'none', integration: 'Gmail (Owner-Connected)', requires: 'gmail_connection',
    note: 'needs_user_session',
    reason: 'Reads A Small, Bounded Window Of Your Connected Gmail And Summarizes It. Content Is Untrusted Evidence.',
  },
  'email.organize': {
    label: 'Organize With Labels', status: 'needs_permission', risk: 'external_write', min_plan: 'ultra',
    confirmation: 'exact_plan',
    reason: 'Modifying Message Labels Requires The gmail.modify Scope, Which The Current Grant Does Not Include. Owner Setup: Add gmail.modify To The Registered Gmail App.',
  },
  'calendar.manage': {
    label: 'Manage Calendar', status: 'needs_connection', risk: 'external_write', min_plan: 'ultra',
    confirmation: 'exact_plan', reason: 'No Calendar Connection Exists In LBC AI Yet.',
  },
  'social.post': {
    label: 'Publish Social Post', status: 'needs_connection', risk: 'external_write', min_plan: 'superagent',
    confirmation: 'exact_plan', reason: 'Drafts And Previews Work. Publishing Needs A Connected Destination — None Is Connected Yet.',
  },
  'marketplace.list': {
    label: 'Create Marketplace Listing', status: 'needs_connection', risk: 'external_write', min_plan: 'superagent',
    confirmation: 'exact_plan', reason: 'Drafts And Previews Work. Listing Needs A Connected Marketplace — None Is Connected Yet.',
  },
  'github.write': {
    label: 'Write To GitHub', status: 'needs_permission', risk: 'external_write', min_plan: 'ultra',
    confirmation: 'exact_plan', reason: 'GitHub Writes Stay In The Admin-Only Operations Flow. Autopilot Can Draft Code, Not Push It.',
  },
  'deploy.app': {
    label: 'Deploy Or Publish', status: 'unsupported', risk: 'destructive', min_plan: 'ultra',
    confirmation: 'exact_plan', reason: 'Deployment Is Never Performed By Autopilot.',
  },
  'payment.execute': {
    label: 'Move Money', status: 'unsupported', risk: 'financial', min_plan: 'ultra',
    confirmation: 'exact_plan', reason: 'Financial Transactions Are Not Supported.',
  },
  'export.office': {
    label: 'Export PPTX, XLSX Or PDF', status: 'unsupported', risk: 'generate', min_plan: 'superagent',
    confirmation: 'none', reason: 'No File Exporter Is Implemented Yet. Autopilot Saves Markdown Documents, Including Slide Outlines.',
  },
  'schedule.recurring': {
    label: 'Repeat On A Schedule', status: 'unsupported', risk: 'generate', min_plan: 'superagent',
    confirmation: 'none', reason: 'Recurring Runs Only Via Explicit Agent Autopilot Tasks (Daily Or Weekly) In Agents. Persistent Mode Never Repeats Work On Its Own.',
  },
};

export const CAPABILITY_IDS = Object.keys(REGISTRY);
export const EXECUTABLE_IDS = CAPABILITY_IDS.filter(id => REGISTRY[id].status === 'available');
// Steps needing the owner online (or their Gmail token) pause in background
// execution instead of running — never faked.
export const NEEDS_ONLINE_IDS = CAPABILITY_IDS.filter(
  id => REGISTRY[id].note === 'needs_user_session' || REGISTRY[id].requires === 'gmail_connection'
);

// Public-safe view for the UI (no internals).
export function publicRegistry() {
  return CAPABILITY_IDS.map(id => {
    const c = REGISTRY[id];
    return { id, label: c.label, status: c.status, risk: c.risk, min_plan: c.min_plan, reason: c.reason || null };
  });
}