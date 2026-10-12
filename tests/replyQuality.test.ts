// Synthetic-only tests for grounded-reply marker repair and reply style rules.
import { assertEquals, assert } from "jsr:@std/assert@1.0.13";
import { repairGroundingMarkers as r } from "../base44/shared/citations.ts";
import { buildAgentSystemPrompt } from "../base44/shared/userAgents.ts";

Deno.test("unresolved grounding markers are removed, prose intact", () => {
  assertEquals(r("WSIB is no-fault [1], so facts matter [4, 6]."), "WSIB is no-fault, so facts matter.");
});
Deno.test("markers resolve to named links when sources are listed", () => {
  const out = r("Rates rose [1].\n\n[1]: https://www.bankofcanada.ca/rates");
  assert(out.includes("Rates rose ([bankofcanada.ca](https://www.bankofcanada.ca/rates))."));
  assert(out.includes("[1]: https://www.bankofcanada.ca/rates"));
});
Deno.test("real markdown links and images survive", () => {
  const s = "See [Reuters](https://reuters.com) and ![chart](https://x.io/a.png).";
  assertEquals(r(s), s);
});
Deno.test("ordered steps, amounts, dates, equations, IDs unchanged", () => {
  const s = "1. Pay $1,250.00 on 2026-10-12\n2. Solve 2x + 3 = 11\n3. VIN 1HGCM82633A004352, ref [A12]";
  assertEquals(r(s), s);
});
Deno.test("code blocks and inline code are never touched", () => {
  const s = "Use `arr[1]` here:\n```js\nconst x = a[0] + [1];\n```";
  assertEquals(r(s), s);
});
Deno.test("array index and nested brackets preserved", () => {
  assertEquals(r("matrix[2] and [[1]] stay"), "matrix[2] and [[1]] stay");
});
Deno.test("emoji and Arabic preserved", () => {
  assertEquals(r("مرحبا 👋🏽 [2]"), "مرحبا 👋🏽");
});
Deno.test("casual reply has no added list", () => {
  const s = "Hey! Doing well, thanks 😊 What are you working on today?";
  assertEquals(r(s), s);
});
Deno.test("agent prompt carries style rules and keeps safety rules", () => {
  const p = buildAgentSystemPrompt({ name: "A", persona: "P", voice: "warm", instructions: "i" }, []);
  assert(p.includes("REPLY STYLE"));
  assert(p.includes("SAFETY RULES (NON-NEGOTIABLE)"));
  assert(p.indexOf("REPLY STYLE") < p.indexOf("SAFETY RULES"));
});