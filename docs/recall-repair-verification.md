# LBC AI Ultra — Recall Repair Verification

Scope: this app only. Nothing was published. No migrations, backfill, ownership reassignment, cross-app sync or production data changes were made.

## Root Causes (Verified In Source)
1. **Main chat not wired.** The main chat imported `loadMemories`, which the memory module no longer exported, so the backend failed to bundle. It also never called `recallHistory`. Fix: the shared `assembleContinuity` module loads settings (fail-closed), eligible memories and recall. The main chat now uses it and injects `buildMemorySection(result)` plus `buildRecallSection(recall, tz)`. Extraction now runs with `{ base44, db, user, settings }`.
2. **Recall intent too narrow.** The parser had no handling for "before 5 hours", "5h ago" or repeated words ("a a"). Fix: text is normalized first (case, repeated words, punctuation), quoted text is stripped, and negation is detected. Both relative-time forms are now recognized.
3. **"Continue Our Last Conversation" returned no_match.** Threads with no topic hit were always dropped when there was no time window. Fix: an explicit last/previous-thread request now selects the most recent eligible prior thread by real message timestamps, excluding the current thread.
4. **First-200 truncation.** The current thread loaded its oldest 200 messages. It now loads the newest 200 and returns them in chronological order (`loadRecentThread`).

## Changed Files
- `base44/functions/chatWithLumina/entry.ts`: wiring, persona section, recent-window history, timezone input, continuity status in the response
- `base44/shared/chatContinuity.ts` (new)
- `base44/shared/historyRecall.ts`: intent normalization, relative-time parsing, latest-thread selection
- `base44/shared/longTermMemory.ts`, `base44/shared/memoryPolicy.ts`: consent policy (from the previous turn, unchanged this turn)
- `base44/functions/manageUserMemory/entry.ts`: settings, review/approve, forget tombstones, edit validation
- `base44/functions/fetchSisterConversations/entry.ts`: fail-closed, returns 410
- `base44/entities/UserMemory.jsonc` (new fields; client updates now server-only), `MemorySettings.jsonc` (new), `MemorySuppression.jsonc` (new)
- `src/components/converse/ContextToggle.jsx`: the real "Your Conversation History" switch
- `src/components/settings/MemorySection.jsx`, `src/components/settings/MemoryControls.jsx` (new), `src/hooks/useMemorySettings.js` (new)
- `src/pages/Converse.jsx`: sends the browser timezone (validated server-side, used only for date math)
- `tests/recallRepair.test.ts` (new)

## Tests Run (Synthetic Fixtures, Mocked Entity Interfaces Only)
- `esbuild <entry> --bundle --platform=neutral --external:npm:* --external:base44:*` for chatWithLumina, manageUserMemory and fetchSisterConversations: **exit 0** for all three.
- `npx vite build`: **exit 0**. `npx eslint . --quiet`: **exit 0, 0 errors** (no preexisting failures found).
- `tests/recallRepair.test.ts`: **24/24 pass.** The sandbox blocks `deno test` directly, so the file was bundled with esbuild and run under Node with a minimal `Deno.test`/assert shim.
- Coverage: FAIL A, B and C repros; paraphrases; quoted examples, negation and non-recall requests; canonical match with excerpt, title and link; disabled history makes zero reads; foreign parent rejected (including admin) and forged creator rejected; anonymous legacy rejected; foreign child rejected; quarantined parent and child rejected; search error differs from no_match; ambiguity; more than 60 messages reports partial; delimiter-injection neutralized; Toronto DST days are 23h and 25h; more than 200 messages keeps the newest; memory off; sensitive opt-in; credential rejection; low-confidence inferences dropped; corrections; forget tombstone blocks re-extraction; legacy, other-user and revoked-source memories excluded; chat wiring fails closed on settings error, matches when enabled, and keeps the default off.

## Not Tested (Runtime)
- The full live HTTP handler (real auth, real RLS, real LLM). Only the shared wiring module was tested with mocks.
- Live model behavior: following STATUS blocks, budgeting arithmetic quality, persona tone. These are prompt-level only and **unverified**.
- Mobile and accessibility visual checks, and agents/build/knowledge regressions. These flows' code was not modified.

## Residual Blockers And Notes
- **Project/agent scope:** the Conversation schema has no project field, and agent chats use a separate entity. Recall is therefore limited to main-chat threads that are server-stamped `human_verified` and owned by the session user. Older threads without that stamp are excluded (fail-closed) and were not modified. Memories are retrieved only with `scope: personal`.
- **Legacy memories** (saved before policy v2) are shown as "Not Used". They are retrieved only after the user taps "Use This Memory".
- **Defaults:** history access is OFF until the user enables it (chat Context panel or Settings → Memory). The owner's five-hours-ago request will get an "enable or select the thread" reply until then.
- **syncConversation:** the existing cross-app push after each chat was left untouched, per scope. Only the reading endpoint was fail-closed.
- **No rate limiting** was added beyond bounded query sizes (30 threads, 8 read, 60 messages per thread).

## Handler Privacy Repair (2026-10-12, After Colour Commit 082c0138)
The four independently reported handler failures were fixed with one shared authorization module. No records were updated, deleted, stamped or migrated, and nothing was published.

### Changed Files
- `base44/shared/conversationAccess.ts` (new). It holds the central helpers:
  - `isOwnedConversation` / `isOwnedMessage`, moved here and re-exported from historyRecall.
  - `sanitizeIds`: string ids up to 64 characters of `[A-Za-z0-9_-]`, deduplicated and bounded to 5 selected threads.
  - `quarantineSet`: looks up 100 ids at a time. A full page of 500 throws rather than being silently truncated, and any lookup error throws.
  - `authorizeConversation`: an explicit service-side read with the session-owner predicate, `human_verified` and not quarantined. Errors return null.
  - `eligibleMessages` and `authorizeSelectedThreads`.
- `base44/functions/chatWithLumina/entry.ts`:
  1. **Current parent:** authorized before any save, generation or memory step. Foreign, anonymous, quarantined, malformed or unverifiable parents get a non-disclosing **404**, and admin role or RLS-visible reads grant nothing.
  2. **Explicit selection:** goes through `authorizeSelectedThreads`, which applies the same parent and child rules as automatic recall. Quarantined parents and children are excluded. Lookup errors produce an "could not be verified" note, never inclusion. Restricted results produce a "not available" note, never "empty".
  3. **Current thread:** uses eligible children only, in chronological order. If rows existed but were filtered, the prompt says earlier turns are unavailable rather than "no prior turns". The title is only generated when the thread truly has no rows.
- `base44/shared/chatContinuity.ts`: `loadRecentThread(db, user, id, limit)` now applies child eligibility and returns `{ messages, restricted, total }`.
- `base44/shared/historyRecall.ts`: uses the shared helpers and the paginated quarantine lookup. Its recall logic, five-hours wording, latest-thread selection, partial reporting and citations are unchanged.
- `base44/shared/longTermMemory.ts`: memory source threads must now also be not quarantined, and lookup errors make memory status "error".
- `tests/handlerIsolation.test.ts` (new). `tests/recallRepair.test.ts`: one test was updated for the new `loadRecentThread` signature, with the same assertions plus the owner stamp on the fixture rows.

### Tests Run
- **Real-entrypoint handler tests** (`tests/handlerIsolation.test.ts`): **13/13 pass.** Each test sends a real `Request` through the default export of `chatWithLumina/entry.ts`.
  - Bundled with `esbuild --platform=node --format=cjs --external:npm:* --external:base44:* --external:jsr:*`.
  - Only `npm:@base44/sdk` (mapped to an in-memory client) and `base44:runtime` secrets (`{}`) are mocked.
  - Covered: A 401; B consented recall match containing the real sentence; default history off is disabled; C foreign selected child absent; D quarantined selected parent absent; quarantined selected child absent with own sibling kept; own selected thread included exactly once with duplicates removed; anonymous, foreign, missing and malformed selected ids excluded with a "not available" note; E admin with a foreign current parent gets 404 with zero writes and zero model calls; normal user with foreign, anonymous, quarantined, missing or malformed current parent gets 404 with zero writes; quarantine lookup failure fails closed (404, zero writes, zero model calls); F foreign current child absent while own children stay in order; quarantined current child absent and never reported as an empty thread.
  - These tests were written to your outline in this sandbox. Your coordinator files (`today_lbc_verification/*`) were not accessible here, and the old code was not re-run against this harness.
- `tests/recallRepair.test.ts`: **24/24 pass.**
- Function bundles: `esbuild … --platform=neutral --external:npm:* --external:base44:*` gives **exit 0** for chatWithLumina and manageUserMemory.
- `npx vite build`: **exit 0**. `npx eslint . --quiet`: **exit 0**.
- Deep-link regression: recall citations still use `/?c=<id>`, which the chat route still reads. Checked in source; no chat UI code was changed this turn.

### Not Tested
Live auth/session behavior, real RLS, real AiDataQuarantine contents, the real model, and mobile/browser flows.

### Behavior Notes
Older messages without an owner stamp are now excluded from the prompt (fail-closed). They are not modified. The user is told earlier turns are unavailable. The other original audit items (agent/project scope, syncConversation, rate limits) stay as listed above.

## State
Current editor source: implemented and tested as above. Backend functions auto-deploy to the dev/preview environment only. **Not published.** Synthetic test passes do not prove production behavior, and the earlier synthetic failures were not proof of a production leak.