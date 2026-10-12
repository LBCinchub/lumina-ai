# LBC AI Ultra: Logo Palette Recolour

Scope: this app only. Preview only, not published. No backend, schema, data, auth, memory/recall or chat-scroll changes. The logo file (`/brand/lbc-builder-teal.v1.512.png`) and `BrandLogo` are untouched.

## Palette (Taken From The Teal/Cyan Logo On Black)
- Dark theme: primary teal `173 80% 40%` (#14b8a6), with near-black text on it. Primary buttons use a teal → cyan gradient (#14b8a6 → #06b6d4). The active nav uses a teal tint (`176 35% 11%`) with teal text (`170 70% 65%`). Focus rings are teal. Surfaces stay neutral near-black.
- Light theme: darker teal primary `175 84% 25%` with white text. The accent is a pale teal tint with deep teal text. Focus rings are dark teal. The warm paper background is unchanged.
- Untouched: destructive red, amber/green/blue/rose (semantic) colours, chart category tokens, and uploaded or generated content.

## Changed Files
- `src/index.css`: light and dark primary, accent, ring and sidebar tokens; the primary gradient; the active-nav ring (outer glow removed).
- `tailwind.config.js`: the theme remaps the legacy decorative `pink`/`fuchsia` scales to teal and `purple`/`violet`/`indigo` to cyan. Steps 400+ are darker than stock for contrast. Every existing pink/purple class on reachable surfaces now renders in the logo palette, with no blanket filter and no layout changes. This covers chat user bubbles, the shell/nav, the landing hero/pricing/features/navbar/footer, the early-access dialog, Pricing, Face ID dialogs, Terminal and Operations. Class names in source still read "pink"/"purple" but render teal/cyan.
- Hardcoded values replaced:
  - `components/chat/MessageBubble.jsx`: the image glow is now a soft teal.
  - `components/landing/LandingPricing.jsx`: the featured plan's glow is now teal.
  - `pages/Pricing.jsx`: the featured border gradient is now teal → cyan.
  - `components/context/LBCFamilyTree.jsx`: the decorative stroke is now teal.
- Not changed: `components/lumina/*` (legacy orb; still unreachable) and `components/layout/LuminaMark` (uses currentColor, so it follows the theme).

## Tests Run
- `npx vite build`: exit 0. `npx eslint . --quiet`: exit 0.
- Leftover scan:
  - Built CSS: 0 matches for the old pink/purple hex and rgba values.
  - `src` (excluding the unreachable `components/lumina`): 0 matches.
- WCAG contrast (computed):

| Pair | Ratio | Result |
|---|---|---|
| Light: white on primary | 5.56 | Pass |
| Light: primary link on background | 5.25 | Pass |
| Light: active nav text | 7.59 | Pass |
| Light: focus ring vs background | 5.25 | Pass |
| Dark: button text on teal | 7.93 | Pass |
| Dark: button text on cyan | 8.14 | Pass |
| Dark: link on background | 7.93 | Pass |
| Dark: active nav text | 10.21 | Pass |
| Dark: focus ring vs card | 7.5 | Pass |
| White on remapped pink-500 | 5.47 | Pass |
| White on remapped purple-600 | 5.36 | Pass |
| Remapped 300 text on dark | 10.61 | Pass |
| Remapped 400 text on dark | 7.93 | Pass |
| Remapped 600 text on light | 5.16 | Pass |
| **Remapped 400 on a light background** | **2.35** | **Fails** |

  The last row fails if any light-mode surface uses `pink-400`/`purple-400` text. Most of these accents sit on dark-only surfaces (landing, terminal). This was not audited per-component.

## Screenshots
- Captured: the signed-out landing page on mobile. It shows the teal → cyan headline, teal CTA buttons and teal chat-preview bubbles, with no pink or purple left.
- Desktop capture failed (tool error).

## Not Verified
- Signed-in surfaces in a browser: chat bubbles, composer, jump-to-latest, sidebar, toggles, dialogs, settings, desktop and light mode. The preview is signed out.
- Hover, focus and disabled states; reduced motion. The colour changes only touched colour values, and motion rules are unchanged.
- No new chat regression test was run; no chat logic was touched.

## Follow-Up: Light-Theme Accent Contrast (2026-10-12)
- **Fix:** teal/cyan shades 300 and 400 now follow the theme, through new variables in `src/index.css` used by `tailwind.config.js`.
  - Light theme: deep teal #0f766e / #115e59 and cyan #0e7490 / #155e75.
  - Dark theme and the always-dark public landing (new `lbc-dark-surface` class on `src/pages/Landing.jsx`): the previous bright shades, unchanged.
  - Indigo is only used on always-dark admin surfaces (Operations, Deployment Engine, Protocol Guard, Resource Monitor), so it keeps its static cyan.
- **Pricing page:** the small teal text and check icons (`text-pink-500`) measured about 3.7:1 on the dark theme, below 4.5:1. They now switch to the bright shade in dark mode (`dark:text-pink-300`).
- **Pages affected:** Terminal and command templates, chat image captions, Devices, Notifications, Templates and GitHub Backup, Face ID dialogs, Device Verification, and Pricing.
- **Measured contrast:**

| Shade | Light: paper / card / muted | Dark: page / card / muted | Landing / dialog |
|---|---|---|---|
| Teal 300 | 5.16 / 5.38 / 4.72 | 10.61 / 10.03 / 9.59 | 10.69 / 9.52 |
| Teal 400 | 7.15 / 7.45 / 6.54 | 7.93 / 7.5 / 7.18 | — |
| Cyan 300 | 5.05 / 5.26 / 4.62 | 10.93 | — |
| Cyan 400 | 6.86 / 7.14 / 6.27 | 8.14 | — |
| Pricing text | 5.16 (light) | 10.61 (dark) | — |

  The previously reported 2.35 failure is resolved.
- **Remaining caveat:** text shown at reduced opacity (for example `/60` on the chat image caption) is lower than these figures and was not measured individually.
- **Checks run:** `npx vite build` exit 0 and `npx eslint . --quiet` exit 0. The compiled CSS shows the light and dark variables and `.text-pink-400` resolving through them. No new screenshots were taken.

## Release Blockers (Unchanged)
The high-severity recall-handler privacy findings are still open. This visual change does not resolve them.