# CLAUDE.md

Guidance for Claude (and any AI agent) working in this repo. See also `AGENTS.md` for the canonical rule set — this file mirrors and extends it for Claude-specific quirks.

## Project

Balaio: online React/Vite PWA + Fastify API + PostgreSQL + Drizzle ORM + Socket.IO realtime collaboration. Online-only v1.

## Commands

```bash
npm install
docker compose up -d
npm run db:push
npm run dev
npm run build
npm run typecheck
```

## Mobile / PWA Viewport (CRITICAL — DO NOT REGRESS)

The app renders edge-to-edge like a native iOS/Android app, both in Safari mobile browser and as installed PWA. The git history shows several attempts that regressed this. Read these rules before touching any viewport / safe-area / mobile CSS in `apps/web/src/index.css` or `apps/web/index.html`.

### Locked CSS contracts (`apps/web/src/index.css`)

- **`html`, `body`, `#root`, `.app-shell` all use `min-height: 100vh; min-height: 100lvh;`** — keep BOTH lines (the `100vh` is the legacy fallback for older browsers; the `100lvh` is the real fix).
  - **Never replace with `100dvh`.** `100dvh` (dynamic viewport) shrinks when Safari iOS toolbar slides in, leaving a visible white/cream "browser bar" below the body. `100lvh` (largest viewport) always fills the maximum possible screen so the body background extends under any browser chrome.
  - Symptom of regression: horizontal white/cream stripe at the bottom of the screen above the floating bottom-tabs pill, appearing to overlay the tabs.
- **`html` and `body` keep `height: 100%`** in addition to `min-height`. Both are required for full fill on iOS Safari.
- **`.bottom-tabs` mobile uses `bottom: 18px`** — floats above the edge with breathing room.
  - Do NOT set to `0` (touches edge, looks docked instead of floating).
  - Do NOT set to `env(safe-area-inset-bottom)` or `calc(env(...) - N)` — creates a visible white gap between the pill and the iOS home indicator gesture area.
- **`.topbar` mobile uses `padding-top: max(env(safe-area-inset-top), 20px)`** — required to clear the iPhone notch / dynamic island.
  - Removing `env(safe-area-inset-top)` here makes content render under the notch.
  - The `max(..., 20px)` floor ensures non-notch devices still get vertical breathing room.
- **`apps/web/index.html` viewport meta MUST keep `viewport-fit=cover`** — required for `env(safe-area-inset-*)` to work and for edge-to-edge rendering.
- **`apple-mobile-web-app-capable=yes`** + **`apple-mobile-web-app-status-bar-style=black-translucent`** in `index.html` are required for iOS PWA standalone mode. Do not change.

### Manifest contract (`apps/web/public/manifest.webmanifest`)

- `"display": "standalone"` — do not change to `browser` or `minimal-ui`.
- `"theme_color"` and `"background_color"` should match the app's `--color-bg` (currently `#FAF9F6`).

### When user reports "white bar at the bottom"

Diagnostic order:

1. Verify `.bottom-tabs` is `bottom: 18px` (not `0`, not safe-area-bound).
2. Verify `html`, `body`, `#root`, `.app-shell` all use `100lvh` (NOT `100dvh`).
3. Verify `index.html` has `viewport-fit=cover`.
4. If all three are correct and user STILL sees a bar: **they are running the URL in Safari mobile, not as an installed PWA.** Safari iOS shows a URL toolbar at the bottom that no CSS can remove. Tell the user to: Share → "Add to Home Screen" → open from the home screen icon.

Do NOT "fix" this by adding `safe-area-inset-bottom` padding, by docking the tabs, or by hiding elements. Each of those regresses the design.

### When user reports "topbar under the notch"

Diagnostic: `.topbar` lost its `padding-top: max(env(safe-area-inset-top), 20px)`. Restore it. Do not use a fixed `padding-top` — non-notch devices need a different value than notched devices, and `env(safe-area-inset-top)` resolves correctly on each.

## Other Rules (mirrored from `AGENTS.md`)

- Online-only v1. No offline sync unless roadmap changes.
- No Supabase. PostgreSQL via the API.
- Validate sharing permissions in the API.
- Socket.IO rooms named `fair:{fairId}` for realtime updates.
- UI: minimal, dense enough for daily use, Balaio colors.
- Inter for UI text. Caveat Brush only for brand assets.
- Assets under `apps/web/public/assets`.
- Prefer small, focused modules over broad abstractions.

## Planning

GSD artifacts live in `.planning/`.
