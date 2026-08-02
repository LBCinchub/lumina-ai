import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { requireFounderOrAdmin, errorResponse } from '../../shared/security.ts';
import { getVpsCreds } from '../../shared/vps.ts';

const VPS_BASE = 'https://vpspanel.web-hosting.com/api/index.php';
const VPS_ID = '3403130354u2y3z284846415';

function vpsUrl(creds, action, extra = '') {
  return `${VPS_BASE}?key=${creds.key}&hash=${creds.hash}&action=${action}&vserverid=${VPS_ID}${extra}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { error } = await requireFounderOrAdmin(base44);
    if (error) return errorResponse(error);

    const creds = getVpsCreds();
    if (!creds) return Response.json({ error: 'Service unavailable' }, { status: 503 });

    const { action } = await req.json();

    const allowedActions = ['info', 'boot', 'reboot', 'shutdown', 'status'];
    if (!action || !allowedActions.includes(action)) {
      return Response.json({ error: `Invalid action. Allowed: ${allowedActions.join(', ')}` }, { status: 400 });
    }

    const url = vpsUrl(creds, action);
    const res = await fetch(url);
    const text = await res.text();

    // VPS panel returns XML or JSON depending on action
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      // Parse simple key=value format some VPS panels return
      data = {};
      text.split('\n').forEach(line => {
        const [k, ...v] = line.split('=');
        if (k && v.length) data[k.trim()] = v.join('=').trim();
      });
    }

    return Response.json({ success: true, action, result: data, raw: text });
  } catch (error) {
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});