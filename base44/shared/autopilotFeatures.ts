// Typed adapters from Autopilot steps to EXISTING LBC AI feature handlers.
// Always invoked with the owner's own user-scoped client (their session), so
// each handler's own auth, plan and rate gates apply. Never the service role.
// Strict, deterministic success interpretation; receipts only after re-read.
import { researchHasResults, sourcesFooter, verifyReadableImage, isAllowedImageUrl } from './chatTools.ts';

export const FEATURE_IDS = ['research.deep', 'build.design', 'image.generate', 'image.edit'];

const fail = (code: string) => { throw new Error(code); };
const errText = (e: any) => String(e?.response?.data?.error || '').slice(0, 200);

// Non-idempotent writes are never blindly retried after an ambiguous attempt.
function guardRetry(step: any, idempotent: boolean) {
  if (!idempotent && (step.attempts || 0) > 1) fail('ambiguous_retry');
}

async function call(userClient: any, fn: string, payload: any) {
  try {
    const r = await userClient.functions.invoke(fn, payload);
    return r?.data ?? null;
  } catch (e) {
    const t = errText(e);
    throw new Error(t ? `handler_rejected:${t}` : 'handler_failed');
  }
}

export async function runFeature(step: any, ctx: any, input: string, opts: { fetchFn?: typeof fetch } = {}) {
  if (!ctx.userClient) fail('needs_user_session');
  const u = ctx.userClient;
  switch (step.capability_id) {
    case 'research.deep': {
      guardRetry(step, false);
      const r = await call(u, 'deepSearch', { question: input.slice(0, 2000) });
      if (!researchHasResults(r)) fail('research_no_sources');
      return {
        output: `${String(r.answer).slice(0, 15000)}\n\n${sourcesFooter(r, new Date().toISOString().slice(0, 10))}`,
        sources: r.sources.slice(0, 15).map((s: any) => ({ title: String(s.title || s.url).slice(0, 200), url: String(s.url).slice(0, 500) })),
      };
    }
    case 'build.design': {
      const r = await call(u, 'orchestrateBuild', { step: 'design', message: input.slice(0, 3000), history: ctx.evidence ? ctx.evidence.slice(0, 6000) : '' });
      const content = typeof r?.content === 'string' ? r.content.trim() : '';
      if (!content) fail('design_empty');
      const img = isAllowedImageUrl(r?.image_url) ? `\n\n![Design Preview](${r.image_url})` : '\n\n(Preview Image Was Not Generated.)';
      return { output: `${content.slice(0, 8000)}${img}\n\nDraft Only. Nothing Was Pushed Or Deployed.` };
    }
    case 'image.generate': {
      guardRetry(step, false);
      const r = await call(u, 'lbcTwinImage', { action: 'generate_with_text', prompt: input.slice(0, 1500) });
      return await verifiedImage(u, r?.job?.id, r?.base_image_url, 'Generated Image');
    }
    case 'image.edit': {
      guardRetry(step, false);
      const ref = ctx.context?.image_ref;
      if (!ref || !isAllowedImageUrl(ref)) fail('image_ref_missing');
      if (!(await verifyReadableImage(ref, opts.fetchFn))) fail('image_ref_unreadable');
      const r = await call(u, 'lbcTwinImage', { action: 'edit_reference', prompt: input.slice(0, 1500), reference_image_url: ref });
      return await verifiedImage(u, r?.job?.id, r?.image_url, 'Edited Image (Original Kept)');
    }
    default:
      return fail('capability_not_executable');
  }
}

// Receipt only after the saved asset is re-read under the owner's RLS.
async function verifiedImage(u: any, jobId: any, url: any, label: string) {
  if (typeof jobId !== 'string' || !isAllowedImageUrl(url)) fail('image_not_created');
  const rows = await u.entities.SavedImageAsset.filter({ source_job_id: jobId }).catch(() => null);
  const asset = Array.isArray(rows) ? rows.find((a: any) => a.image_url === url) : null;
  if (!asset) fail('image_verify_failed');
  return { output: `${label}:\n\n![${label}](${url})`, artifact_image_url: url };
}