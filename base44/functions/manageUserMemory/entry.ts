import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { MEMORY_CATEGORIES, loadMemorySettings } from '../../shared/longTermMemory.ts';
import {
  POLICY_VERSION, SENSITIVE_CATEGORIES, normalizeSettings, eligibilityReason,
  containsSecret, classifySensitivity, sensitiveAllowed, suppressionKeys,
} from '../../shared/memoryPolicy.ts';

// Authenticated memory controls. Ownership always comes from the server
// session; the browser never supplies owner ids/emails. Responses only report
// a save after the write succeeded.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || !user.id || !user.email) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { action, id } = body;
    const db = base44.asServiceRole;
    const st = await loadMemorySettings(db, user);
    if (!st.ok) return Response.json({ error: 'Memory Settings Unavailable — Please Try Again.' }, { status: 503 });
    const settings = st.settings;

    const owned = async () => {
      const rows = await db.entities.UserMemory.filter({ id, owner_email: user.email });
      return rows.find(r => r.owner_email === user.email) || null;
    };
    const suppress = async (texts) => {
      const keys = [...new Set((await Promise.all(texts.map(suppressionKeys))).flat())];
      if (keys.length) await db.entities.MemorySuppression.bulkCreate(keys.map(k => ({ owner_user_id: user.id, key_hash: k })));
    };

    if (action === 'list') {
      const items = await db.entities.UserMemory.filter({ owner_email: user.email }, '-updated_date', 200);
      return Response.json({
        settings,
        memories: items.filter(m => m.owner_email === user.email).map(m => ({ ...m, ineligible_reason: eligibilityReason(m, settings) })),
      });
    }

    if (action === 'setSettings') {
      const next = normalizeSettings({ ...settings, ...(body.settings || {}) });
      const data = { ...next, owner_user_id: user.id, changed_at: new Date().toISOString() };
      const saved = st.record
        ? await db.entities.MemorySettings.update(st.record.id, data)
        : await db.entities.MemorySettings.create(data);
      return Response.json({ settings: normalizeSettings(saved) });
    }

    if (action === 'update' || action === 'approve') {
      const m = await owned();
      if (!m) return Response.json({ error: 'Not Found' }, { status: 404 });
      const text = String(action === 'update' ? body.content : m.content || '').trim().slice(0, 400);
      if (!text) return Response.json({ error: 'Memory Cannot Be Empty' }, { status: 400 });
      if (containsSecret(text)) return Response.json({ error: 'Memories Cannot Contain Passwords, Account Numbers Or Keys.' }, { status: 400 });
      const cats = classifySensitivity(text);
      if (m.sensitive_category && SENSITIVE_CATEGORIES.includes(m.sensitive_category)) cats.push(m.sensitive_category);
      if (!sensitiveAllowed(cats, settings)) {
        return Response.json({ error: `Turn On Sensitive Memory For ${[...new Set(cats)].join(', ')} First.` }, { status: 400 });
      }
      const category = MEMORY_CATEGORIES.includes(body.category) ? body.category : (m.category || 'fact');
      const saved = await db.entities.UserMemory.update(m.id, {
        content: text, category, scope: 'personal', status: 'active', policy_version: POLICY_VERSION,
        sensitive_category: cats[0] || '', source_role: 'user_edit', confidence: 1,
        last_reinforced_at: new Date().toISOString(),
      });
      return Response.json({ memory: { ...saved, ineligible_reason: eligibilityReason(saved, settings) } });
    }

    if (action === 'delete') {
      const m = await owned();
      if (!m) return Response.json({ error: 'Not Found' }, { status: 404 });
      await suppress([m.content]);
      await db.entities.UserMemory.delete(m.id);
      return Response.json({ deleted: true });
    }

    if (action === 'clearAll') {
      const items = (await db.entities.UserMemory.filter({ owner_email: user.email }, '-updated_date', 500))
        .filter(m => m.owner_email === user.email);
      await suppress(items.map(m => m.content));
      await db.entities.UserMemory.deleteMany({ owner_email: user.email });
      return Response.json({ cleared: true });
    }

    return Response.json({ error: 'Unknown Action' }, { status: 400 });
  } catch (_) {
    return Response.json({ error: 'Something Went Wrong' }, { status: 500 });
  }
}