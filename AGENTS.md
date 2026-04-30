# AGENTS.md

## Project

Balaio is an online React/Vite PWA with a Fastify API, PostgreSQL, Drizzle ORM, and Socket.IO realtime collaboration.

## Commands

```bash
npm install
docker compose up -d
npm run db:push
npm run dev
npm run build
npm run typecheck
```

## Rules

- Keep app online-only for v1. Do not add offline sync unless roadmap changes.
- Do not introduce Supabase. Use PostgreSQL through the API.
- Validate all sharing permissions in the API.
- Use Socket.IO rooms named `fair:{fairId}` for realtime feira updates.
- Keep UI minimal, dense enough for daily use, and aligned with Balaio colors.
- Use Inter for UI text. Use Caveat Brush only for brand assets.
- Keep assets under `apps/web/public/assets`.
- Prefer small, focused modules over broad abstractions.

## Mobile / PWA Viewport (CRITICAL — DO NOT REGRESS)

The app must render edge-to-edge like a native iOS/Android app, both in Safari mobile browser and as installed PWA. Several attempts in the git history regressed this — read these rules before touching any viewport / safe-area / mobile CSS.

### Locked CSS contracts in `apps/web/src/index.css`

- **Use `100lvh`, not `100dvh`, for full-viewport height.** `html`, `body`, `#root`, `.app-shell` all use `min-height: 100vh; min-height: 100lvh;` (the `100vh` line is the legacy fallback — keep both).
  - Why: `100dvh` (dynamic viewport) shrinks when Safari iOS toolbar slides in, leaving a visible white "browser bar" below the body. `100lvh` (largest viewport) always fills the maximum possible screen so the body background extends under any browser chrome. Symptom of using `100dvh`: a horizontal white/cream stripe appears at the bottom of the screen above the floating bottom-tabs pill.
- **`html` and `body` keep `height: 100%`** in addition to `min-height`. Both required for full fill on iOS Safari.
- **`.bottom-tabs` mobile uses `bottom: 18px`** — floats above the edge with breathing room. Do NOT set to `0` (touches edge) or to `env(safe-area-inset-bottom)` (creates a white gap between pill and home-indicator on iOS).
- **`.topbar` mobile uses `padding-top: max(env(safe-area-inset-top), 20px)`** — required to clear the iPhone notch / dynamic island. Removing the `env(safe-area-inset-top)` makes content render under the notch.
- **`apps/web/index.html` viewport meta has `viewport-fit=cover`** — required for `env(safe-area-inset-*)` to work and for edge-to-edge rendering. Do not remove.
- **`apple-mobile-web-app-capable=yes`** + **`apple-mobile-web-app-status-bar-style=black-translucent`** in `index.html` are required for iOS PWA standalone mode.

### When PWA still shows a "browser bar" at the bottom

If user reports a white bar at the bottom **even after the CSS above is in place**, the cause is almost always: **the user is running the URL in Safari mobile, not as an installed PWA.** Safari iOS shows a URL toolbar at the bottom that no CSS can remove.

Resolution path: Share → "Add to Home Screen" → open from the home screen icon. Then `display: standalone` from the manifest activates and the toolbar disappears.

Do not "fix" this by adding `safe-area-inset-bottom` padding or hiding elements — both regress the design.

### Manifest

`apps/web/public/manifest.webmanifest` must keep `"display": "standalone"`. Do not change to `browser` or `minimal-ui`.

## Planning

GSD artifacts live in `.planning/`.

Current next step: `/gsd-plan-phase 1`.
