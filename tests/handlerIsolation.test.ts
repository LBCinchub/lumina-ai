// Synthetic real-entrypoint isolation tests for chatWithLumina.
// Only dependencies are mocked: the SDK client (createClientFromRequest is
// mapped to globalThis.__client by the runner) and runtime secrets ({}).
// Every request goes through the actual default-exported HTTP handler.
import { assertEquals, assert } from "jsr:@std/assert@1.0.13";
import handler from "../base44/functions/chatWithLumina/entry.ts";

const A = { id: "fixture-a", email: "fixture-a@example.invalid", role: "user" };
const B_EMAIL = "fixture-b@example.invalid";
const NOW = new Date().toISOString();
const EARLIER = new Date(Date.now() - 3600000).toISOString();
const parent = (o = {}) => ({ id: "current-fixture", owner_email: A.email, created_by: A.email, ownership_state: "human_verified", title: "Current", last_message_at: NOW, ...o });
const past = (o = {}) => parent({ id: "past-fixture", title: "Past", last_message_at: EARLIER, ...o });
const msg = (o = {}) => ({ id: "m-past", conversation_id: "past-fixture", owner_email: A.email, role: "user", content: "Synthetic prior topic is planting herbs", created_date: EARLIER, ...o });

function match(rec, q) {
  return Object.entries(q || {}).every(([k, v]) => {
    const x = rec[k];
    if (v && typeof v === "object" && !Array.isArray(v)) {
      if ("$in" in v && !v.$in.includes(x)) return false;
      if ("$gte" in v && !(String(x) >= v.$gte)) return false;
      if ("$lte" in v && !(String(x) <= v.$lte)) return false;
      return true;
    }
    return x === v;
  });
}

function world({ session = A, convos = [parent(), past()], msgs = [], quarantine = [], settings, failQuarantine = false } = {}) {
  const writes = [], prompts = [];
  const store = {
    Conversation: convos, Message: msgs, AiDataQuarantine: quarantine,
    MemorySettings: settings ? [{ id: "s", owner_user_id: A.id, ...settings }] : [{ id: "s", owner_user_id: A.id, memory_enabled: false, history_access_enabled: false }],
    UserMemory: [], MemorySuppression: [], UserContext: [], Document: [], KnowledgeSource: [], UserSubscription: [],
  };
  const table = (name) => ({
    filter: async (q, sort, limit = 50) => {
      if (name === "AiDataQuarantine" && failQuarantine) throw new Error("synthetic lookup failure");
      let r = (store[name] || []).filter(x => match(x, q));
      if (typeof sort === "string" && sort) {
        const desc = sort.startsWith("-"); const f = sort.replace("-", "");
        r = [...r].sort((a, b) => String(a[f]).localeCompare(String(b[f])) * (desc ? -1 : 1));
      }
      return r.slice(0, limit || 50);
    },
    list: async () => [],
    create: async (d) => { writes.push(["create", name, d]); return { id: `new-${writes.length}`, ...d }; },
    update: async (id, d) => { writes.push(["update", name, id, d]); return { id, ...d }; },
  });
  const entities = new Proxy({}, { get: (_, n) => table(String(n)) });
  const client = {
    auth: { me: async () => { if (!session) throw new Error("401"); return session; } },
    entities,
    asServiceRole: { entities },
    integrations: { Core: {
      InvokeLLM: async (a) => { prompts.push(String(a.prompt)); return a.response_json_schema ? { memories: [] } : "Synthetic response only"; },
      GenerateImage: async () => ({ url: "https://example.invalid/x.png" }),
    } },
  };
  (globalThis as any).__client = client;
  return { writes, prompts };
}

const call = async (body) => {
  const res = await handler(new Request("http://localhost/chat", { method: "POST", body: JSON.stringify(body) }));
  return { status: res.status, json: await res.json() };
};
const base = { conversation_id: "current-fixture", timezone: "UTC" };
const absent = (prompts, s) => prompts.every(p => !p.includes(s));
const settle = () => new Promise(r => setTimeout(r, 20));

Deno.test("A: no session -> 401 before writes/LLM", async () => {
  const w = world({ session: null });
  const r = await call({ ...base, message: "hello there" });
  assertEquals(r.status, 401); assertEquals(w.writes.length, 0); assertEquals(w.prompts.length, 0);
});

Deno.test("B: consented automatic recall of own prior thread -> match with real sentence", async () => {
  const w = world({ settings: { memory_enabled: false, history_access_enabled: true }, msgs: [msg()] });
  const r = await call({ ...base, message: "continue our last conversation" });
  assertEquals(r.status, 200); assertEquals(r.json.continuity.recall, "match");
  assert(w.prompts.some(p => p.includes("Synthetic prior topic is planting herbs")));
});

Deno.test("default consent: history off -> recall disabled, prior content absent", async () => {
  const w = world({ msgs: [msg()] });
  const r = await call({ ...base, message: "continue our last conversation" });
  assertEquals(r.json.continuity.recall, "disabled");
  assert(absent(w.prompts, "planting herbs"));
});

Deno.test("C: explicit selection with foreign-owned child -> sentinel absent", async () => {
  const w = world({ msgs: [msg({ owner_email: B_EMAIL, content: "SYNTHETIC_FOREIGN_CHILD_SENTINEL" })] });
  const r = await call({ ...base, message: "Summarize the selected thread please", explicit_context: { conversation_ids: ["past-fixture"] } });
  assertEquals(r.status, 200); assert(w.prompts.length > 0);
  assert(absent(w.prompts, "SYNTHETIC_FOREIGN_CHILD_SENTINEL"));
});

Deno.test("D: explicit selection of quarantined parent -> sentinel absent", async () => {
  const w = world({ msgs: [msg({ content: "SYNTHETIC_QUARANTINED_SENTINEL" })], quarantine: [{ entity_type: "Conversation", record_id: "past-fixture", resolved: false }] });
  const r = await call({ ...base, message: "Summarize the selected thread please", explicit_context: { conversation_ids: ["past-fixture"] } });
  assertEquals(r.status, 200); assert(absent(w.prompts, "SYNTHETIC_QUARANTINED_SENTINEL"));
});

Deno.test("explicit selection: quarantined child excluded, own sibling kept", async () => {
  const w = world({ msgs: [msg({ id: "q1", content: "SYNTHETIC_QCHILD_SENTINEL" }), msg({ id: "ok1", content: "SYNTHETIC_OWN_SIBLING" })], quarantine: [{ entity_type: "Message", record_id: "q1", resolved: false }] });
  await call({ ...base, message: "Summarize the selected thread please", explicit_context: { conversation_ids: ["past-fixture"] } });
  assert(absent(w.prompts, "SYNTHETIC_QCHILD_SENTINEL")); assert(w.prompts.some(p => p.includes("SYNTHETIC_OWN_SIBLING")));
});

Deno.test("explicit selection positive: own eligible thread included once (deduped)", async () => {
  const w = world({ msgs: [msg({ content: "SYNTHETIC_OWN_SELECTED" })] });
  await call({ ...base, message: "Summarize the selected thread please", explicit_context: { conversation_ids: ["past-fixture", "past-fixture"] } });
  const main = w.prompts[0];
  assertEquals(main.split("SYNTHETIC_OWN_SELECTED").length - 1, 1);
});

Deno.test("explicit selection: anonymous-legacy, foreign, missing and malformed ids excluded", async () => {
  const w = world({
    convos: [parent(), past({ ownership_state: "anonymous_legacy" }), past({ id: "foreign-past", owner_email: B_EMAIL, created_by: B_EMAIL })],
    msgs: [msg({ content: "SYNTHETIC_ANON_SENTINEL" }), msg({ id: "f1", conversation_id: "foreign-past", owner_email: B_EMAIL, content: "SYNTHETIC_FOREIGN_PARENT_SENTINEL" })],
  });
  const r = await call({ ...base, message: "Summarize the selected thread please", explicit_context: { conversation_ids: ["past-fixture", "foreign-past", "does-not-exist", { $ne: null }, "x".repeat(200)] } });
  assertEquals(r.status, 200);
  assert(absent(w.prompts, "SYNTHETIC_ANON_SENTINEL")); assert(absent(w.prompts, "SYNTHETIC_FOREIGN_PARENT_SENTINEL"));
  assert(w.prompts[0].includes("Some selected content is not available"));
});

Deno.test("E: admin session with foreign current parent -> 404, zero writes/LLM", async () => {
  const w = world({ session: { ...A, role: "admin" }, convos: [parent({ owner_email: B_EMAIL, created_by: B_EMAIL })] });
  const r = await call({ ...base, message: "Summarize this conversation" });
  await settle();
  assertEquals(r.status, 404); assertEquals(w.writes.length, 0); assertEquals(w.prompts.length, 0);
});

Deno.test("normal user with foreign / anonymous / quarantined / malformed current parent -> 404, zero writes", async () => {
  const cases = [
    { convos: [parent({ owner_email: B_EMAIL })] },
    { convos: [parent({ ownership_state: "anonymous_legacy" })] },
    { convos: [parent()], quarantine: [{ entity_type: "Conversation", record_id: "current-fixture", resolved: false }] },
    { convos: [] },
  ];
  for (const c of cases) {
    const w = world(c);
    const r = await call({ ...base, message: "Summarize this conversation" });
    await settle();
    assertEquals(r.status, 404); assertEquals(w.writes.length, 0); assertEquals(w.prompts.length, 0);
  }
  const w = world();
  const r = await call({ conversation_id: { $ne: null }, message: "hi there" });
  assertEquals(r.status, 404); assertEquals(w.writes.length, 0);
});

Deno.test("quarantine lookup failure fails closed: 404, zero writes/LLM", async () => {
  const w = world({ failQuarantine: true });
  const r = await call({ ...base, message: "Summarize this conversation" });
  await settle();
  assertEquals(r.status, 404); assertEquals(w.writes.length, 0); assertEquals(w.prompts.length, 0);
});

Deno.test("F: foreign child in current thread excluded; own children kept in order", async () => {
  const w = world({ msgs: [
    { id: "c1", conversation_id: "current-fixture", owner_email: A.email, role: "user", content: "SYNTHETIC_OWN_FIRST", created_date: "2026-01-01T00:00:01Z" },
    { id: "c2", conversation_id: "current-fixture", owner_email: B_EMAIL, role: "user", content: "SYNTHETIC_CURRENT_FOREIGN_SENTINEL", created_date: "2026-01-01T00:00:02Z" },
    { id: "c3", conversation_id: "current-fixture", owner_email: A.email, role: "assistant", content: "SYNTHETIC_OWN_SECOND", created_date: "2026-01-01T00:00:03Z" },
  ] });
  const r = await call({ ...base, message: "Summarize this conversation" });
  assertEquals(r.status, 200);
  assert(absent(w.prompts, "SYNTHETIC_CURRENT_FOREIGN_SENTINEL"));
  const p = w.prompts[0];
  assert(p.indexOf("SYNTHETIC_OWN_FIRST") > -1 && p.indexOf("SYNTHETIC_OWN_FIRST") < p.indexOf("SYNTHETIC_OWN_SECOND"));
});

Deno.test("current thread: quarantined own child excluded, never reported as empty thread", async () => {
  const w = world({ msgs: [{ id: "qc", conversation_id: "current-fixture", owner_email: A.email, role: "user", content: "SYNTHETIC_QCURRENT_SENTINEL", created_date: EARLIER }], quarantine: [{ entity_type: "Message", record_id: "qc" }] });
  await call({ ...base, message: "Summarize this conversation" });
  assert(absent(w.prompts, "SYNTHETIC_QCURRENT_SENTINEL"));
  assert(w.prompts[0].includes("not available to you"));
});