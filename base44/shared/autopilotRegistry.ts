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
  'research.deep': {
    label: 'Deep Research With Citations', status: 'available', risk: 'read', min_plan: 'ultra',
    confirmation: 'none', integration: 'LBC AI Deep Search', source: 'Public web (untrusted, cited)',
    input: 'research question', output: 'answer + named source links', idempotent: false,
    note: 'needs_user_session', handler: 'deepSearch', timeout_ms: 140000,
    reason: 'Runs The Existing Deep Search Under Your Own Session And Plan Limits. Only Counts As Done When Real Sources Return.',
  },
  'build.design': {
    label: 'Draft A Build Design', status: 'available', risk: 'draft', min_plan: 'superagent',
    confirmation: 'none', integration: 'Build Workspace', source: 'Task + selected project',
    input: 'what to design', output: 'design description + preview image (no push, no deploy)', idempotent: true,
    note: 'needs_user_session', handler: 'orchestrateBuild', timeout_ms: 120000,
    reason: 'Drafts A Design In The Build Workspace Style. Never Pushes Code Or Deploys.',
  },
  'image.generate': {
    label: 'Generate An Image', status: 'available', risk: 'generate', min_plan: 'free',
    confirmation: 'none', integration: 'Image Studio', source: 'Task',
    input: 'image description', output: 'image saved to your image library', idempotent: false,
    note: 'needs_user_session', handler: 'lbcTwinImage', timeout_ms: 120000,
  },
  'image.edit': {
    label: 'Edit A Selected Image', status: 'available', risk: 'generate', min_plan: 'free',
    confirmation: 'none', integration: 'Image Studio', source: 'Your selected image',
    input: 'requested change', output: 'edited copy (original kept)', idempotent: false,
    note: 'needs_user_session', handler: 'lbcTwinImage', needs_context: 'image_ref', timeout_ms: 120000,
  },
  'knowledge.ingest': {
    label: 'Add To Knowledge Sources', status: 'blocked', risk: 'generate', min_plan: 'free',
    confirmation: 'none',
    reason: 'Handoff Only: Add Sources Explicitly In Knowledge Sources, Where URL And Content Checks Run. Autopilot Never Ingests On Its Own.',
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

// No trusted scheduler credential is verified, so nothing is background
// eligible. Changing this requires proven scheduler authentication.
export const SCHEDULER_VERIFIED = false;

const PLAN_RANK = { free: 0, superagent: 1, ultra: 2 };

// Per-user availability: the single source of truth for UI and planner.
// opts: { plan, gmailConnected, context: { image_ref } }. null = usable now.
export function availabilityFor(id, opts: any = {}) {
  const c = REGISTRY[id];
  if (!c) return 'Unknown Capability.';
  if (c.status !== 'available') return c.reason || 'Not Available.';
  if ((PLAN_RANK[opts.plan] ?? 0) < PLAN_RANK[c.min_plan]) return `Requires LBC AI ${c.min_plan === 'ultra' ? 'Ultra' : 'Superagent'}.`;
  if (c.requires === 'gmail_connection' && !opts.gmailConnected) return 'Connect Your Gmail In Autopilot First.';
  if (c.needs_context === 'image_ref' && !opts.context?.image_ref) return 'Select An Image First (Use Edit With Autopilot On An Image).';
  return null;
}

// Public-safe view for the UI (no internals, no handler names).
export function publicRegistry(opts: any = {}) {
  return CAPABILITY_IDS.map(id => {
    const c = REGISTRY[id];
    return {
      id, label: c.label, status: c.status, risk: c.risk, min_plan: c.min_plan, reason: c.reason || null,
      blocker: availabilityFor(id, opts), confirmation: c.confirmation || 'none',
      background_eligible: SCHEDULER_VERIFIED && !NEEDS_ONLINE_IDS.includes(id),
    };
  });
}

// App-wide feature catalog for chat discovery. Same file = one truth source.
// Autopilot step handlers stay in REGISTRY above (the planner's allowlist);
// these entries are explain/route-only — chat never executes them directly.
// mode: read | draft | action | route. confirmation mirrors the real flow.
export const FEATURE_CATALOG = [
  { id: 'chat.research', label: 'Chat And Web Research', mode: 'read', route: '/', aliases: ['research', 'web search'], min_plan: 'superagent', confirmation: 'none', autopilot: 'research.web', how: 'Ask In Chat. Live Web Search Needs Superagent Or Ultra.' },
  { id: 'research.deep', label: 'Deep Research With Citations', mode: 'read', route: '/', aliases: ['deep research', 'deep search'], min_plan: 'ultra', confirmation: 'none', autopilot: 'research.deep', how: 'Ask Me To Deep Research A Question.' },
  { id: 'documents', label: 'Documents And Knowledge Sources', mode: 'route', route: '/knowledge', aliases: ['documents', 'knowledge', 'library'], min_plan: 'free', confirmation: 'none', how: 'Add Sources In Knowledge Sources. Autopilot Can Save Markdown Documents For You.' },
  { id: 'memory', label: 'Personal Memory Controls', mode: 'route', route: '/settings', aliases: ['memory', 'forget', 'history access'], min_plan: 'free', confirmation: 'none', how: 'Turn Memory And Past-Chat Recall On Or Off In Settings.' },
  { id: 'agents', label: 'Agents And Agent Tasks', mode: 'route', route: '/agents', aliases: ['agents', 'agent tasks'], min_plan: 'free', confirmation: 'none', how: 'Create Agents In Agents, Or Mention One Here With @AgentName.' },
  { id: 'build', label: 'Build And Projects', mode: 'route', route: '/build', aliases: ['build', 'projects'], min_plan: 'superagent', confirmation: 'none', autopilot: 'build.design', how: 'Open Build For Projects. Autopilot Can Draft A Design, Never Push Or Deploy.' },
  { id: 'images', label: 'Image Generation And Editing', mode: 'draft', route: '/', aliases: ['image', 'images'], min_plan: 'free', confirmation: 'none', autopilot: 'image.generate', how: 'Ask For An Image In Chat. Edits Keep The Original.' },
  { id: 'gmail', label: 'Gmail (Your Own Account)', mode: 'action', route: '/autopilot', aliases: ['gmail', 'email', 'inbox'], min_plan: 'ultra', confirmation: 'exact_plan', autopilot: 'email.send', connection: 'gmail', how: 'Connect Your Own Gmail In Autopilot. Sending Always Needs Your Approval Of The Exact Message.' },
  { id: 'github', label: 'GitHub Connection', mode: 'route', route: '/github', aliases: ['github', 'repository'], min_plan: 'free', confirmation: 'none', connection: 'github', how: 'Connect Your Own GitHub On The GitHub Connection Screen. Chat Never Pushes Code.' },
  { id: 'templates.backup', label: 'Template Backup To GitHub', mode: 'action', route: '/templates', aliases: ['template backup', 'backup'], min_plan: 'free', confirmation: 'exact_plan', connection: 'github', admin_only: true, how: 'Open Templates And Choose Back Up To GitHub. You Review The Exact Backup Before Anything Is Committed.' },
  { id: 'templates', label: 'Templates And Terminal', mode: 'route', route: '/templates', aliases: ['templates', 'terminal'], min_plan: 'free', confirmation: 'none', how: 'Save And Run Command Templates In Templates And Terminal. Chat Never Runs Commands.' },
  { id: 'autopilot', label: 'Autopilot Runs And Approvals', mode: 'action', route: '/autopilot', aliases: ['autopilot', 'tasks', 'approvals'], min_plan: 'free', confirmation: 'exact_plan', how: 'Ask Me To Do A Multi-Step Task. Anything That Sends, Posts Or Spends Waits For Your Approval.' },
  { id: 'settings', label: 'Devices And Settings', mode: 'route', route: '/settings', aliases: ['settings', 'devices', 'face id'], min_plan: 'free', confirmation: 'none', how: 'Manage Devices, Face ID, Theme And Memory In Settings.' },
];