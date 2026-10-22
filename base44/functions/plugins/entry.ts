import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { listPlugins, previewInstall, installPlugin, setPluginEnabled, uninstallPlugin } from '../../shared/plugins.ts';

// Plugin library API for the signed-in user. Identity comes only from the
// session; plugin ids are resolved against the closed server registry.
export default async function (req: Request) {
  const base44 = createClientFromRequest(req);
  let user = null;
  try { user = await base44.auth.me(); } catch (_) {}
  if (!user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const ctx = { base44, db: base44.asServiceRole, user };
  const a = body.action;
  if (a === 'list') return Response.json({ plugins: await listPlugins(ctx) });
  if (a === 'preview') return Response.json(await previewInstall(ctx, body.plugin_id));
  if (a === 'install') return Response.json(await installPlugin(ctx, { plugin_id: body.plugin_id, version: body.version, permission_hash: body.permission_hash, install_id: body.install_id }));
  if (a === 'set_enabled') return Response.json(await setPluginEnabled(ctx, { plugin_id: body.plugin_id, enabled: body.enabled === true }));
  if (a === 'uninstall') return Response.json(await uninstallPlugin(ctx, { plugin_id: body.plugin_id }));
  return Response.json({ error: 'Unknown action' }, { status: 400 });
}