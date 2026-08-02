import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { requireFounderOrAdmin, errorResponse } from '../../shared/security.ts';

// DISABLED: founder/owner mode is derived server-side only and is never written
// as ordinary user context. This endpoint intentionally does nothing and contains
// no founder PII.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { error } = await requireFounderOrAdmin(base44);
    if (error) return errorResponse(error);
    return Response.json(
      { success: false, disabled: true, message: "Founder identity is server-derived and cannot be self-assigned." },
      { status: 410 }
    );
  } catch (error) {
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});