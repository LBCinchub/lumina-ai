// Detects real external-action requests in chat so they route to Autopilot's
// typed pipeline instead of a model claiming it posted or listed something.
export function detectActionIntent(message) {
  const t = String(message || '').toLowerCase();
  const listing = /\b(list|sell|put|place|post)\b[^.?!]{0,60}\b(marketplace|for sale|listing)\b/.test(t) || /\b(marketplace)\b[^.?!]{0,40}\b(list|sell|listing)\b/.test(t);
  if (listing) return 'marketplace_listing';
  const email = /\b(send|draft|compose|write|reply to)\b[^.?!]{0,40}\b(e-?mails?)\b/.test(t) || /\b(e-?mails?)\b[^.?!]{0,30}\b(send|draft|compose)\b/.test(t);
  if (email) return 'email_send';
  if (/\bmarketing\b/.test(t) && /\b(put|place|placing|list)\b/.test(t)) return 'marketing_ambiguous';
  if (/\b(post|publish)\s+(this|it|that|a post|my|the|something)\b/.test(t) || /\bcaption\b[^.?!]{0,40}\bpost\b/.test(t)) return 'social_post';
  return null;
}

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