// Unit tests for the LBC AI data-integrity pure helpers.
// Run: deno test --allow-env base44/shared/integrity.test.ts
import { assertEquals } from "jsr:@std/assert@1.0.13";
import {
  isHumanEmail,
  classifyParent,
  splitCohort,
  verifyDriftTargets,
  planDriftApply,
  DRIFT_TARGETS,
  BASELINE_CUTOFF,
  BASELINE_TOTALS,
} from "./integrity.ts";

Deno.test("isHumanEmail rejects empty/anonymous/service markers", () => {
  assertEquals(isHumanEmail(null), false);
  assertEquals(isHumanEmail(""), false);
  assertEquals(isHumanEmail("anonymous"), false);
  assertEquals(isHumanEmail("service@x.com"), false);
  assertEquals(isHumanEmail("nobody@no-reply.base44.com"), false);
  assertEquals(isHumanEmail("mokhtartareksamara@gmail.com"), true);
});

Deno.test("classifyParent: human_verified with valid email", () => {
  assertEquals(classifyParent({ ownership_state: "human_verified", owner_email: "a@b.com" }), "human_verified");
});

Deno.test("classifyParent: anonymous_legacy without email stays anonymous", () => {
  assertEquals(classifyParent({ ownership_state: "anonymous_legacy", owner_email: null }), "anonymous_legacy");
  assertEquals(classifyParent({ ownership_state: "anonymous_legacy", owner_email: "" }), "anonymous_legacy");
});

Deno.test("classifyParent: anonymous_legacy carrying email -> unavailable", () => {
  assertEquals(classifyParent({ ownership_state: "anonymous_legacy", owner_email: "a@b.com" }), "owner_metadata_unavailable");
});

Deno.test("classifyParent: human_verified without email -> unavailable", () => {
  assertEquals(classifyParent({ ownership_state: "human_verified", owner_email: null }), "owner_metadata_unavailable");
});

Deno.test("no browser identity trust: bare owner_email without stamp -> unavailable", () => {
  // A browser-supplied owner_email must NOT be trusted without the stamp.
  assertEquals(classifyParent({ owner_email: "a@b.com" }), "owner_metadata_unavailable");
  assertEquals(classifyParent({}), "owner_metadata_unavailable");
  assertEquals(classifyParent(null), "owner_metadata_unavailable");
});

Deno.test("splitCohort: cutoff is exclusive for post-baseline", () => {
  const recs = [
    { id: "1", created_date: "2026-08-02T02:24:38.000000" },
    { id: "2", created_date: BASELINE_CUTOFF },
    { id: "3", created_date: "2026-08-02T02:24:39.000000" },
  ];
  const { baseline, postBaseline } = splitCohort(recs, BASELINE_CUTOFF);
  assertEquals(baseline.length, 1);
  assertEquals(postBaseline.length, 2);
});

Deno.test("post-baseline cohort reporting: 80/954/48 baseline preserved, delta separate", () => {
  const convos = [
    ...Array.from({ length: 80 }, (_, i) => ({ id: `b-c-${i}`, created_date: "2026-08-02T02:24:38.000000" })),
    { id: "post-c", created_date: BASELINE_CUTOFF },
  ];
  const c = splitCohort(convos, BASELINE_CUTOFF);
  assertEquals(c.baseline.length, BASELINE_TOTALS.Conversation);
  assertEquals(c.postBaseline.length, 1);
});

Deno.test("anonymous exclusion: 15 anonymous parents + 24 messages stay unassigned", () => {
  const parents = Array.from({ length: 15 }, (_, i) => ({
    id: `anon-${i}`,
    ownership_state: "anonymous_legacy",
    owner_email: null,
  }));
  for (const p of parents) assertEquals(classifyParent(p), "anonymous_legacy");
  const convoById = {};
  for (const p of parents) convoById[p.id] = p;
  const msgs = Array.from({ length: 24 }, (_, i) => ({
    id: `am-${i}`,
    conversation_id: parents[i % 15].id,
    owner_email: null,
  }));
  let anonCount = 0;
  let backfillable = 0;
  for (const m of msgs) {
    const pc = classifyParent(convoById[m.conversation_id]);
    if (pc === "anonymous_legacy") anonCount++;
    else if (pc === "human_verified" && !m.owner_email) backfillable++;
  }
  // All 24 anonymous messages are excluded from backfill; none get an owner.
  assertEquals(anonCount, 24);
  assertEquals(backfillable, 0);
});

Deno.test("verifyDriftTargets: clean pre-fix state passes", () => {
  const r = verifyDriftTargets({
    convo: { id: DRIFT_TARGETS.conversation.id, owner_email: null, ownership_state: null },
    messages: DRIFT_TARGETS.messages.map((m) => ({
      id: m.id,
      conversation_id: m.conversation_id,
      owner_email: m.expected_owner_email,
    })),
    shared: { id: DRIFT_TARGETS.shared.id, conversation_id: DRIFT_TARGETS.shared.conversation_id, owner_email: null },
    actorOwnsConversation: true,
  });
  assertEquals(r.ok, true);
  assertEquals(r.reasons, []);
});

Deno.test("verifyDriftTargets: created_by not actor aborts (session evidence)", () => {
  const r = verifyDriftTargets({
    convo: { id: DRIFT_TARGETS.conversation.id, owner_email: null, ownership_state: null },
    messages: DRIFT_TARGETS.messages.map((m) => ({ id: m.id, conversation_id: m.conversation_id, owner_email: m.expected_owner_email })),
    shared: { id: DRIFT_TARGETS.shared.id, conversation_id: DRIFT_TARGETS.shared.conversation_id, owner_email: null },
    actorOwnsConversation: false,
  });
  assertEquals(r.ok, false);
  assertEquals(r.reasons.includes("created_by_not_actor"), true);
});

Deno.test("verifyDriftTargets: non-null owner_email aborts (no double-stamp)", () => {
  const r = verifyDriftTargets({
    convo: { id: DRIFT_TARGETS.conversation.id, owner_email: "already@set.com", ownership_state: null },
    messages: DRIFT_TARGETS.messages.map((m) => ({ id: m.id, conversation_id: m.conversation_id, owner_email: m.expected_owner_email })),
    shared: { id: DRIFT_TARGETS.shared.id, conversation_id: DRIFT_TARGETS.shared.conversation_id, owner_email: null },
    actorOwnsConversation: true,
  });
  assertEquals(r.ok, false);
  assertEquals(r.reasons.includes("conversation_owner_email_not_null"), true);
});

Deno.test("verifyDriftTargets: parent/child mismatch aborts", () => {
  const r = verifyDriftTargets({
    convo: { id: DRIFT_TARGETS.conversation.id, owner_email: null, ownership_state: null },
    messages: [{ id: DRIFT_TARGETS.messages[0].id, conversation_id: "WRONG", owner_email: DRIFT_TARGETS.messages[0].expected_owner_email }],
    shared: { id: DRIFT_TARGETS.shared.id, conversation_id: DRIFT_TARGETS.shared.conversation_id, owner_email: null },
    actorOwnsConversation: true,
  });
  assertEquals(r.ok, false);
  assertEquals(r.reasons.some((x) => x.startsWith("message_parent_mismatch")), true);
});

Deno.test("planDriftApply: only missing fields; messages already owned -> skipped", () => {
  const plan = planDriftApply({
    convo: { id: DRIFT_TARGETS.conversation.id, owner_email: null },
    shared: { id: DRIFT_TARGETS.shared.id, owner_email: null },
  });
  assertEquals(plan.conversation !== null, true);
  assertEquals(plan.conversation.owner_email, DRIFT_TARGETS.conversation.applied_owner_email);
  assertEquals(plan.conversation.ownership_state, "human_verified");
  assertEquals(plan.shared !== null, true);
  assertEquals(plan.shared.owner_email, DRIFT_TARGETS.shared.applied_owner_email);
  assertEquals(plan.messages, []);
});

Deno.test("planDriftApply: idempotent — already-stamped records skipped", () => {
  const plan = planDriftApply({
    convo: { id: DRIFT_TARGETS.conversation.id, owner_email: DRIFT_TARGETS.conversation.applied_owner_email },
    shared: { id: DRIFT_TARGETS.shared.id, owner_email: DRIFT_TARGETS.shared.applied_owner_email },
  });
  assertEquals(plan.conversation, null);
  assertEquals(plan.shared, null);
  assertEquals(plan.messages, []);
});