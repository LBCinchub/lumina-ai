// Typed chat routing for plugin commands. Only the signed-in user's own
// message is parsed (quoted/negated text stripped); email, document and
// tool output can never reach here as a command.
import { directiveText } from './actionIntent.ts';
import { getPlugin, resolvePluginName } from './pluginRegistry.ts';
import { listPlugins, previewInstall, installPlugin, setPluginEnabled, uninstallPlugin, usePlugin } from './plugins.ts';

const END = '[.!?]?$';
export function detectPluginCommand(message: string) {
  const raw = String(message || '').trim();
  const t = directiveText(raw).toLowerCase().replace(/\s+/g, ' ').trim();
  let m;
  if ((m = /^confirm install ([a-z0-9-]+)@(\d+\.\d+\.\d+)[.!]?$/.exec(raw.toLowerCase()))) return { kind: 'confirm', id: m[1], version: m[2] };
  if (new RegExp(`^(show|list|open)( me)? (my|installed|my installed) plugins${END}`).test(t)) return { kind: 'mine' };
  if (new RegExp(`^(show|list|open)( me)?( the| all| available)? plugins?( library)?${END}`).test(t)) return { kind: 'list' };
  if ((m = new RegExp(`^(install|enable|disable|uninstall|remove)( the)? (.+?)${END}`).exec(t))) {
    const p = resolvePluginName(m[3]);
    if (p) return { kind: m[1] === 'remove' ? 'uninstall' : m[1], id: p.id };
    return /\bplugin\b/.test(m[3]) ? { kind: 'unknown', name: m[3].slice(0, 60) } : null;
  }
  if ((m = /^use( the)? (.+?)( plugin)? (to|for) (.+)$/.exec(t))) {
    const p = resolvePluginName(m[2]);
    if (p) return { kind: 'use', id: p.id, input: raw.replace(/^.*?\b(to|for)\b\s*/i, '') };
    return m[3] ? { kind: 'unknown', name: m[2].slice(0, 60) } : null;
  }
  return null;
}

const LABEL: any = { ready: 'Installed', not_installed: 'Not Installed', disabled: 'Disabled', needs_connection: 'Needs Connection', needs_reapproval: 'Needs Re-Approval', plan_restricted: 'Plan Restricted', unavailable: 'Unavailable' };
const card = (title: string, status: string, body: string) => `**Plugin · ${title}**\nStatus: **${status}**\n\n${body}`;

export async function handlePluginCommand(cmd: any, ctx: any) {
  if (cmd.kind === 'unknown') return card('Not Found', 'Unknown Plugin', 'There Is No LBC AI Plugin With That Name. Nothing Was Installed Or Run. Say "Show Plugins" To See The Library.');
  if (cmd.kind === 'list' || cmd.kind === 'mine') {
    const all = await listPlugins(ctx);
    const rows = cmd.kind === 'mine' ? all.filter((p: any) => p.installed) : all;
    if (!rows.length) return card('Library', 'None Installed', 'You Have Not Installed Any Plugins. Say "Show Plugins" To Browse.');
    return card(cmd.kind === 'mine' ? 'My Plugins' : 'Library', `${rows.length} Plugins`, rows.map((p: any) => `- **${p.title}** v${p.version} · ${LABEL[p.state]}${p.reason ? ` · ${p.reason}` : ''}`).join('\n') + '\n\nOpen **Plugins** In The Header For Details.');
  }
  const m = getPlugin(cmd.id);
  if (cmd.kind === 'install') {
    const p: any = await previewInstall(ctx, cmd.id);
    if (!p.ok) return card(m?.title || 'Unknown', 'Unavailable', m?.reason || 'This Plugin Cannot Be Installed.');
    return card(p.plugin.title, 'Review Before Installing', `${p.plugin.description}\n\n**Capabilities:** ${p.plugin.capabilities.join(', ')}\n**Permissions:**\n${p.plugin.permissions.map((x: string) => `- ${x}`).join('\n')}\n**Plan:** ${p.plugin.min_plan} · **Connection:** ${p.plugin.connection || 'None'} · **Publisher:** LBC\n\nInstalling Does Not Connect Accounts Or Grant New Scopes. To Approve Exactly This Version, Reply: Confirm Install ${p.consent.plugin_id}@${p.consent.version}`);
  }
  if (cmd.kind === 'confirm') {
    const p: any = await previewInstall(ctx, cmd.id);
    if (!p.ok) return card(m?.title || 'Unknown', 'Not Installed', 'That Plugin Is Unknown Or Unavailable. Nothing Was Installed.');
    const r = await installPlugin(ctx, { plugin_id: cmd.id, version: cmd.version, permission_hash: p.consent.permission_hash });
    const msg: any = { installed: 'Installed And Enabled.', reapproved: 'Re-Approved For This Version.', already_installed: 'Already Installed; Nothing Changed.', consent_mismatch: 'That Version Is Not The One Currently Offered. Say "Install ' + m.title + '" To Review The Current Permissions.', plan_restricted: 'Your Plan Does Not Include This Plugin. [See Plans](/pricing)', rate_limited: 'Too Many Requests; Try Again In A Minute.' };
    return card(m.title, r.ok ? 'Installed' : 'Not Installed', msg[r.code] || 'Nothing Was Installed.');
  }
  if (cmd.kind === 'enable' || cmd.kind === 'disable') {
    const r = await setPluginEnabled(ctx, { plugin_id: cmd.id, enabled: cmd.kind === 'enable' });
    const msg: any = { enabled: 'Enabled.', disabled: 'Disabled. Its Chat Invocation Is Off. Your Connected Accounts And Core Chat Features (Like Reading Gmail Or Calendar In Chat) Are Not Affected.', not_installed: 'Not Installed.', needs_reapproval: 'Permissions Changed; Say "Install ' + m.title + '" To Re-Approve.' };
    return card(m.title, r.ok ? (cmd.kind === 'enable' ? 'Enabled' : 'Disabled') : 'Unchanged', msg[r.code] || 'Nothing Changed.');
  }
  if (cmd.kind === 'uninstall') {
    const r = await uninstallPlugin(ctx, { plugin_id: cmd.id });
    return card(m.title, r.ok ? 'Removed' : 'Unchanged', r.ok ? 'Removed. Your Documents, Tasks, Messages And Account Connections Were Kept.' : 'It Was Not Installed.');
  }
  const r = await usePlugin(ctx, cmd.id, cmd.input);
  return card(`${m.title} v${m.version}`, r.ok ? 'Done' : 'Blocked', r.text);
}