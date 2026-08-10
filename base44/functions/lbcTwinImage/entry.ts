import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// LBC AI improved image generation.
//   generate_with_text — produces a clean base image WITHOUT text, then asks
//                        the LLM for structured text overlays; the client
//                        renders them on an HTML canvas for crisp, legible text.
//   edit_reference     — decomposes an edit request into atomic operations
//                        (remove/replace/add) for better instruction-following,
//                        then regenerates from the reference photo.
//   get_saved_images   — lists the user's saved image library.
//
// All image assets are private per user (RLS scoped to created_by_id).

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = body.action;

    if (action === 'generate_with_text') {
      const prompt = (body.prompt || '').trim();
      if (!prompt) return Response.json({ error: 'prompt required' }, { status: 400 });

      const job = await base44.entities.ImageGenJob.create({
        prompt, status: 'processing', kind: 'generated', overlays: []
      });

      try {
        // 1. Clean base image — explicitly suppress baked-in text.
        const basePrompt = `${prompt}. Clean photographic composition. No text, no letters, no words, no watermark, no signage lettering.`;
        const baseRes = await base44.integrations.Core.GenerateImage({ prompt: basePrompt });
        const base_image_url = baseRes.url;

        // 2. Ask the LLM for structured text overlays (signs, banners, captions).
        const schema = {
          type: 'object',
          properties: {
            overlays: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  text: { type: 'string' },
                  placement: { type: 'string', enum: ['top', 'center', 'bottom', 'top-left', 'top-right', 'bottom-left', 'bottom-right'] },
                  size: { type: 'string', enum: ['small', 'medium', 'large'] },
                  color: { type: 'string' }
                },
                required: ['text', 'placement', 'size']
              }
            }
          },
          required: ['overlays']
        };
        let overlays = [];
        try {
          const llm = await base44.integrations.Core.InvokeLLM({
            prompt: `The user asked for an image: "${prompt}". Identify any text that SHOULD appear in the image (signs, banners, labels, captions). Return up to 4 text overlays, each with placement, size, and a hex color. If no text is needed, return an empty overlays array.`,
            response_json_schema: schema
          });
          overlays = Array.isArray(llm?.overlays) ? llm.overlays : [];
        } catch (_) { overlays = []; }

        const updated = await base44.entities.ImageGenJob.update(job.id, {
          status: 'ready', base_image_url, overlays
        });
        await base44.entities.SavedImageAsset.create({
          image_url: base_image_url, prompt, kind: 'generated', source_job_id: job.id
        });
        return Response.json({ job: updated, base_image_url, overlays });
      } catch (e) {
        await base44.entities.ImageGenJob.update(job.id, {
          status: 'error', error_message: String(e?.message || e)
        });
        return Response.json({ error: 'Image generation failed' }, { status: 500 });
      }
    }

    if (action === 'edit_reference') {
      const prompt = (body.prompt || '').trim();
      const reference_image_url = body.reference_image_url;
      if (!prompt || !reference_image_url) {
        return Response.json({ error: 'prompt and reference_image_url required' }, { status: 400 });
      }

      const job = await base44.entities.ImageGenJob.create({
        prompt, status: 'processing', kind: 'edited', reference_image_url, overlays: []
      });

      try {
        // Decompose the edit into atomic operations for better following.
        const schema = {
          type: 'object',
          properties: {
            operations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string', enum: ['remove', 'replace', 'add'] },
                  target: { type: 'string' },
                  description: { type: 'string' }
                },
                required: ['type', 'description']
              }
            },
            composite_prompt: { type: 'string' }
          },
          required: ['composite_prompt']
        };
        let composite = prompt;
        let ops = [];
        try {
          const llm = await base44.integrations.Core.InvokeLLM({
            prompt: `Decompose this image edit request into atomic operations (remove/replace/add). A reference photo is provided. Request: "${prompt}". Return a single composite_prompt describing the final desired image, plus an operations array.`,
            response_json_schema: schema
          });
          composite = (llm && llm.composite_prompt) || prompt;
          ops = Array.isArray(llm?.operations) ? llm.operations : [];
        } catch (_) { /* fall back to raw prompt */ }

        const genRes = await base44.integrations.Core.GenerateImage({
          prompt: `${composite}. No text unless explicitly requested.`,
          existing_image_urls: [reference_image_url]
        });
        const image_url = genRes.url;

        const updated = await base44.entities.ImageGenJob.update(job.id, {
          status: 'ready', base_image_url: image_url, overlays: []
        });
        await base44.entities.SavedImageAsset.create({
          image_url, prompt, kind: 'edited', source_job_id: job.id
        });
        return Response.json({ job: updated, image_url, operations: ops });
      } catch (e) {
        await base44.entities.ImageGenJob.update(job.id, {
          status: 'error', error_message: String(e?.message || e)
        });
        return Response.json({ error: 'Edit failed' }, { status: 500 });
      }
    }

    if (action === 'get_saved_images') {
      const rows = await base44.entities.SavedImageAsset.filter({}, '-created_date', 50);
      return Response.json({ images: rows });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}