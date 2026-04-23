import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const VPS_BASE = 'https://vpspanel.web-hosting.com/api/index.php';
const VPS_ID = '3403130354u2y3z284846415';

function vpsUrl(action, extra = '') {
  const key = Deno.env.get('VPS_API_KEY');
  const hash = Deno.env.get('VPS_API_HASH');
  return `${VPS_BASE}?key=${key}&hash=${hash}&action=${action}&vserverid=${VPS_ID}${extra}`;
}

const LUMINA_VPS_SYSTEM = `You are Lumina — a brilliant AI engineer with direct access to the LBC VPS server (server1.lbc.network).

You have these VPS API tools available:
- info: Get server details (RAM, CPU, disk, IP, status)
- status: Get current server status
- boot: Boot the server if it's offline
- reboot: Restart the server
- shutdown: Shut down the server

IMPORTANT RULES:
- You can interpret natural language requests and map them to the correct VPS action
- Be concise and technical in your responses
- Always confirm what action you took and show the result
- If the user asks something you cannot do with available actions, say so clearly
- For deployment/code questions, explain what's possible via the API

Map these requests to actions:
- "is server up/running/online" → status
- "restart/reboot server" → reboot
- "turn off/shutdown server" → shutdown  
- "turn on/start/boot server" → boot
- "server info/specs/details" → info
- "what's the server status" → status`;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (user.email !== 'mokhtartareksamara@gmail.com' && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });
    }

    const { command } = await req.json();
    if (!command) return Response.json({ error: 'Missing command' }, { status: 400 });

    // Ask Lumina to interpret the command and decide the action
    const intentRes = await base44.integrations.Core.InvokeLLM({
      prompt: `${LUMINA_VPS_SYSTEM}\n\nUser request: "${command}"\n\nRespond with a JSON object:\n{\n  "action": "<one of: info|status|boot|reboot|shutdown|none>",\n  "reasoning": "<brief explanation>",\n  "cannot_do": <true if not possible with available actions, false otherwise>\n}`,
      response_json_schema: {
        type: 'object',
        properties: {
          action: { type: 'string' },
          reasoning: { type: 'string' },
          cannot_do: { type: 'boolean' }
        }
      }
    });

    if (intentRes.cannot_do || intentRes.action === 'none') {
      return Response.json({
        success: false,
        message: intentRes.reasoning || "I can't perform that action with the available VPS API. I can check status, boot, reboot, shutdown, or get server info.",
        action: null,
        result: null
      });
    }

    const allowedActions = ['info', 'boot', 'reboot', 'shutdown', 'status'];
    if (!allowedActions.includes(intentRes.action)) {
      return Response.json({ error: 'Invalid action resolved' }, { status: 400 });
    }

    // Execute the VPS API call
    const url = vpsUrl(intentRes.action);
    const vpsRes = await fetch(url);
    const text = await vpsRes.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = {};
      text.split('\n').forEach(line => {
        const [k, ...v] = line.split('=');
        if (k && v.length) data[k.trim()] = v.join('=').trim();
      });
    }

    // Ask Lumina to summarize the result
    const summaryRes = await base44.integrations.Core.InvokeLLM({
      prompt: `You are Lumina, an AI engineer. You just executed the VPS action "${intentRes.action}" on server1.lbc.network.\n\nRaw API result:\n${JSON.stringify(data, null, 2)}\n\nOriginal user request: "${command}"\n\nWrite a clear, concise response (2-4 sentences max) summarizing what happened and what the server's current state is. Be direct and technical.`
    });

    return Response.json({
      success: true,
      action: intentRes.action,
      message: typeof summaryRes === 'string' ? summaryRes : String(summaryRes),
      result: data,
      raw: text
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});