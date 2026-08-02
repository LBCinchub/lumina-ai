import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { requireFounderOrAdmin, errorResponse } from '../../shared/security.ts';
import { getVpsCreds } from '../../shared/vps.ts';

const VPS_BASE = 'https://vpspanel.web-hosting.com/api/index.php';
const VPS_ID = '3403130354u2y3z284846415';

function vpsUrl(creds, action, extra = '') {
  return `${VPS_BASE}?key=${creds.key}&hash=${creds.hash}&action=${action}&vserverid=${VPS_ID}${extra}`;
}

const LBC_AI_VPS_SYSTEM = `You are an LBC AI engineer with direct access to the LBC VPS server (server1.lbc.network).

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
    const { error } = await requireFounderOrAdmin(base44);
    if (error) return errorResponse(error);

    const creds = getVpsCreds();
    if (!creds) return Response.json({ error: 'Service unavailable' }, { status: 503 });

    const { command } = await req.json();
    if (!command) return Response.json({ error: 'Missing command' }, { status: 400 });

    // Ask the model to interpret the command and decide the action
    const intentRes = await base44.integrations.Core.InvokeLLM({
      prompt: `${LBC_AI_VPS_SYSTEM}\n\nUser request: "${command}"\n\nRespond with a JSON object:\n{\n  "action": "<one of: info|status|boot|reboot|shutdown|none>",\n  "reasoning": "<brief explanation>",\n  "cannot_do": <true if not possible with available actions, false otherwise>\n}`,
      response_json_schema: {
        type: 'object',
        properties: {
          action: { type: 'string' },
          reasoning: { type: 'string' },
          cannot_do: { type: 'boolean' }
        }
      }
    });

    const intent = (intentRes && typeof intentRes === 'object') ? intentRes : {};
    if (intent.cannot_do || intent.action === 'none') {
      return Response.json({
        success: false,
        message: intent.reasoning || "I can't perform that action with the available VPS API. I can check status, boot, reboot, shutdown, or get server info.",
        action: null,
        result: null
      });
    }

    const allowedActions = ['info', 'boot', 'reboot', 'shutdown', 'status'];
    if (!allowedActions.includes(intent.action)) {
      return Response.json({ error: 'Invalid action resolved' }, { status: 400 });
    }

    // Execute the VPS API call
    const url = vpsUrl(creds, intent.action);
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

    // Summarize the result
    const summaryRes = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an LBC AI engineer. You just executed the VPS action "${intent.action}" on server1.lbc.network.\n\nRaw API result:\n${JSON.stringify(data, null, 2)}\n\nOriginal user request: "${command}"\n\nWrite a clear, concise response (2-4 sentences max) summarizing what happened and what the server's current state is. Be direct and technical.`
    });

    return Response.json({
      success: true,
      action: intent.action,
      message: typeof summaryRes === 'string' ? summaryRes : String(summaryRes),
      result: data,
      raw: text
    });

  } catch (error) {
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});