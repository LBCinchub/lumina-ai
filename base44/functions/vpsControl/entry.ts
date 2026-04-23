import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const VPS_BASE = 'https://vpspanel.web-hosting.com/api/index.php';
const VPS_ID = '3403130354u2y3z284846415'; // from the URL in the screenshot

function vpsUrl(action, extra = '') {
  const key = Deno.env.get('VPS_API_KEY');
  const hash = Deno.env.get('VPS_API_HASH');
  return `${VPS_BASE}?key=${key}&hash=${hash}&action=${action}&vserverid=${VPS_ID}${extra}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Only Mokhtar (founder) can control the VPS
    if (user.email !== 'mokhtartareksamara@gmail.com' && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { action } = await req.json();

    const allowedActions = ['info', 'boot', 'reboot', 'shutdown', 'status'];
    if (!action || !allowedActions.includes(action)) {
      return Response.json({ error: `Invalid action. Allowed: ${allowedActions.join(', ')}` }, { status: 400 });
    }

    const url = vpsUrl(action);
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
    return Response.json({ error: error.message }, { status: 500 });
  }
});