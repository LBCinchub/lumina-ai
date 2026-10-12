# LBC AI Ultra: Chat Presentation And Reply Style

Scope: this app only. Not published. No migrations, record deletions or ownership changes.

## Route Mapping (Traced In Source)
`/` → RootGate → `pages/Converse.jsx`. The "blue circle" on the live chat was `layout/LuminaMark` (a generic concentric-circle mark). `components/lumina/LuminaOrb.jsx` is imported only by other `components/lumina/*` files, which nothing reachable imports. It was left untouched, and no floating widget was added.

## Changes
- **Reply style** (`base44/functions/chatWithLumina/entry.ts`, HOW YOU SPEAK section only): answer first; concise by default; brief greetings; structure only when it helps; no canned praise, restatements, disclaimers, pitches, sci-fi tone or em dashes; honest about uncertainty, memory and whether actions happened; never implies being human; uses the user's language; personalizes only from verified per-request context. Security, image, truth and recall sections are unchanged.
- **Logo:** `BrandLogo` (the existing `/brand/lbc-builder-teal.v1.512.png`, object-contain, no crop) now appears on assistant replies, the working indicator, the empty state, the signed-out screen and the voice-call overlay. The working state has a soft halo pulse only, disabled under prefers-reduced-motion.
- **Scrolling** (`src/hooks/useChatScroll.js`, `src/components/chat/JumpToLatest.jsx`): removed the unconditional scroll-to-bottom. The view follows new content only when the reader is near the bottom, or right after the user's own send. Growth from late images and layout uses a ResizeObserver, and only while pinned. A 44px "New Reply" / "Jump To Latest" pill appears when scrolled up and disappears once at the latest message. The scroll area uses overscroll-contain, the page uses 100dvh, and the composer adds bottom safe-area padding.
- **Close behavior:** voice-call overlay now ends on Escape, focuses End Call on open and restores focus on close. The mobile threads drawer closes on Escape. Existing dialogs already handle Escape. No close button was added to the full-page chat.
- **Delivery** (`MessageBubble.jsx`, `CopyResponse.jsx`, `markdownComponents.jsx`, `ThinkingIndicator.jsx`):
  - Removed the repeated card header. Text sits at 68ch width with a 1.75 line height.
  - Links open in a new tab with noopener. Code and tables scroll inside their own box. Images are lazy and constrained. No raw HTML is rendered.
  - Copy Response has spoken feedback.
  - Only messages created in this session (`fresh`) fade in once. Loaded history never re-animates. Keys stay stable.
  - The server returns full text only, so the full reply is inserted once. There is no fake streaming and no Stop control.
- **Request safety** (`Converse.jsx`):
  - Removed the client auto-retry loop, which could create duplicate server-side replies.
  - A reply or error is inserted only if its originating thread is still open; otherwise the saved copy shows when the user returns.
  - The working indicator shows only in the sending thread.
  - A late message load for a thread the user already left is ignored.
  - On failure, the user's text is restored to the composer and a plain error is shown.

## Tests Run
- `npx vite build`: exit 0. `npx eslint . --quiet`: exit 0.
- `esbuild` bundle of chatWithLumina: exit 0.
- `tests/recallRepair.test.ts` (synthetic, mocked; run with esbuild and Node using a Deno.test shim): **24/24 pass after the persona change**, including the five-hours-ago, consent and isolation cases.
- Static check: the prompt contains the new style rules and the unchanged SECURITY & BOUNDARIES section. The continuity/recall step is still wired into the chat.

## Not Verified (Runtime)
The preview screenshot showed the signed-out landing page, so none of the following were checked in a browser: desktop/mobile layout, keyboard and screen reader, reduced motion, light/dark contrast, long answers/code/tables, late images, scroll-up while a reply arrives, jump control, voice overlay close/reopen, thread switch mid-request, double-click, error state, Copy Response, animation of new versus old messages, and real model reply tone. No UI tests exist for these. Treat them as unverified until checked manually.

## Known Limits
- Markdown tables render as plain text because remark-gfm is not installed. Installing it needs your approval.
- `components/lumina/*` (legacy orb) remains as unreachable code.

## Preview Instructions
Sign in on the preview, open the chat at `/`, and walk through the list under "Not Verified" above.