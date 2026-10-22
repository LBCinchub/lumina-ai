// Detects real external-action requests in chat so they route to Autopilot's
// typed pipeline instead of a model claiming it posted or listed something.
//
// Every detector runs on DIRECTIVE text only: quoted examples and negated
// clauses ("do not send email", "without posting") are removed first, so a
// prohibition can never open the flow it prohibits.
const QUOTED = /"[^"\n]*"|“[^”\n]*”|`[^`\n]*`|'[^'\n]{3,}'/g;
const NEGATED = /\b(do not|don't|dont|never|must not|should not|shouldn't|no need to|without|avoid|not to|nor)\b[^.;!?\n]*/gi;
export function directiveText(message) {
  return String(message || '').replace(QUOTED, ' ').replace(NEGATED, ' ').replace(/\s+/g, ' ').trim();
}
const ADVICE = /\b(advice|advise|opinion|thoughts on|what do you think|tips? (for|on)|how (do|can|should) i)\b/;
function isQuestionOrAdvice(t) {
  return (QUESTION_START.test(t) && !/^(can|could|would|will) you\b/.test(t)) || ADVICE.test(t);
}

export function detectActionIntent(message) {
  const t = directiveText(message).toLowerCase();
  if (isQuestionOrAdvice(t)) return null;
  const listing = /\b(list|sell|put|place|post)\b[^.?!]{0,60}\b(marketplace|for sale|listing)\b/.test(t) || /\b(marketplace)\b[^.?!]{0,40}\b(list|sell|listing)\b/.test(t);
  if (listing) return 'marketplace_listing';
  const email = /\b(send|draft|compose|write|reply to)\b[^.?!]{0,40}\b(e-?mails?)\b/.test(t) || /\b(e-?mails?)\b[^.?!]{0,30}\b(send|draft|compose)\b/.test(t);
  if (email) return 'email_send';
  if (/\bmarketing\b/.test(t) && /\b(put|place|placing|list)\b/.test(t)) return 'marketing_ambiguous';
  if (/\b(post|publish)\s+(this|it|that|a post|my|the|something)\b/.test(t) || /\bcaption\b[^.?!]{0,40}\bpost\b/.test(t)) return 'social_post';
  return null;
}

// Explicit chat delegation: an imperative request for multi-step work with a
// deliverable ("research X and prepare a report", "summarize my inbox and draft
// replies"). Questions, advice and plain chat return null. Detection only
// starts an internal task; external actions still need exact approval.
const QUESTION_START = /^(how|why|what|when|where|who|which|should|is|are|do|does|did|can i|could i|would|will|tell me about|explain)\b/;
const WORK_VERB = /\b(research|investigate|analy[sz]e|compile|summari[sz]e|review|audit|compare|plan|prepare|draft|write up|put together|build)\b/;
const DELIVERABLE = /\b(report|brief(ing)?|summary|plan|document|doc|memo|proposal|outline|replies|deck|presentation|analysis|roadmap|checklist)\b/;
export function detectDelegation(message) {
  const raw = String(message || '').trim();
  if (raw.length < 12 || raw.length > 3000) return null;
  const prefixed = raw.match(/^(?:please[,\s]+)?(autopilot|run (this )?as a task|delegate|do this for me)\s*[:,-]\s*(.{5,})$/is);
  if (prefixed) return prefixed[3].trim();
  const t = directiveText(raw).toLowerCase().replace(/^(please|pls|hey|ok|okay|lbc( ai)?)[,\s]+/, '');
  if (isQuestionOrAdvice(t)) return null;
  if (!WORK_VERB.test(t) || !DELIVERABLE.test(t)) return null;
  // Needs a chained or explicit hand-off ("... and prepare", "for me",
  // "save it as a document", "using autopilot").
  if (!/\b(and (then )?(prepare|write|create|make|draft|give|produce|send me|turn|save)|for me|into a|save (it|this|that|them|the (result|plan|checklist|output))|as an? (internal |markdown )*(draft|document|doc)|(using|with|via|in) autopilot)\b/.test(t)) return null;
  // The full message (constraints included) is the goal; the planner guard
  // enforces its prohibitions deterministically.
  return raw;
}

export const AUTOPILOT_MARKER = '__AUTOPILOT__';

export function actionIntentReply(kind) {
  if (kind === 'email_send') {
    return `I'll set this up as an **Email** in Autopilot. You give the recipient, subject and message (or a task drafts it), you review the exact content, and nothing is sent from your connected Gmail until you approve it. Sending needs an Ultra connection and your Gmail account connected; nothing has been sent.\n\n[Draft The Email](/autopilot?kind=email_send)`;
  }
  if (kind === 'marketing_ambiguous') {
    return `Quick check so I take the right action — which do you mean?\n\n- **Marketing Content Or Campaign Work** (copy, plan, captions — drafted, nothing published): [Start In Autopilot](/autopilot?kind=task)\n- **A Marketplace Listing** (an item for sale): [Draft A Listing](/autopilot?kind=marketplace_listing)`;
  }
  if (kind === 'marketplace_listing') {
    return `I'll set this up as a **Marketplace Listing** in Autopilot. You'll give the item, category, condition, price, currency, location and a photo, pick the destination yourself, and nothing is published until you approve the exact preview. Right now no marketplace destination is connected to LBC AI, so the listing will be saved as a draft marked **Integration Required**.\n\n[Draft The Listing](/autopilot?kind=marketplace_listing)`;
  }
  return `I'll set this up as a **Social Post** in Autopilot. You choose the destination account, review the exact caption and photo, and approve before anything is sent. Right now no posting destination is connected to LBC AI, so the post will be saved as a draft marked **Needs Connection** — I haven't posted anything.\n\n[Draft The Post](/autopilot?kind=social_post)`;
}