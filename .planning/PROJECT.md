# Balaio

## What This Is

Balaio is an online web/PWA app for organizing monthly feira shopping lists. Users create a feira by month, manage items, prices, quantities, budget, totals, and share the same feira with another user so both can edit in real time.

The product should feel minimal, fast, calm, and practical, with a visual direction close to productivity apps but warmer and more Brazilian.

## Core Value

Two people can manage the same monthly feira list together and trust that items, prices, purchased status, budget, and totals update immediately.

## Requirements

### Validated

(None yet - ship to validate)

### Active

- [ ] User can sign up, log in, stay logged in, and log out.
- [ ] User can create and browse monthly feiras.
- [ ] User can add, edit, delete, and mark feira items as purchased.
- [ ] User can set item quantity, unit, unit price, and see item total.
- [ ] User can set feira budget and see total, remaining amount, and percent used.
- [ ] User can import a previous month feira into a new month.
- [ ] User can share a feira with another user.
- [ ] Multiple users can edit the same feira in real time.
- [ ] PWA installs cleanly on mobile and desktop.
- [ ] UI follows the Balaio design system and asset set.

### Out of Scope

- Offline mode - intentionally excluded to keep v1 simpler and fully online.
- Native mobile app - PWA first; Capacitor or stores only if needed later.
- Supabase dependency - backend must use PostgreSQL directly.
- Complex receipt scanning - useful later, not core to v1.
- Marketplace or price comparison - outside the first value loop.

## Context

- Architecture decided: React + Vite PWA, Fastify API, PostgreSQL, Drizzle ORM, Socket.IO realtime.
- App is not offline-first. It should load online data and use realtime events for live collaboration.
- Design name: Balaio.
- Visual direction: minimal, solid colors, few decorations, warm off-white base, firm greens, tomato orange warning, feira yellow highlight.
- Brand assets and design references live in `D:\Projetos\Feira\Design`.
- Project code lives in `D:\Projetos\Feira\balaio`.

## Constraints

- **Tech stack**: React/Vite + Fastify + PostgreSQL + Drizzle + Socket.IO - chosen for speed, low overhead, realtime, and no Supabase dependency.
- **Runtime**: Web/PWA only - no native app in v1.
- **Connectivity**: Online only - no offline sync or IndexedDB conflict handling in v1.
- **Performance**: App must feel fast on mobile - small bundle, lazy routes later, skeleton loading, minimal libraries.
- **Security**: All sharing and editing permissions must be validated server-side.
- **Design**: UI must use Balaio colors/assets and avoid heavy decorative UI.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Use Fastify instead of NestJS | Lower overhead and better fit for a small realtime app | Pending |
| Use Drizzle instead of Prisma | Lighter ORM and closer SQL control | Pending |
| Use Socket.IO rooms per feira | Simple live collaboration model | Pending |
| Exclude offline mode | Avoid sync complexity and keep app online/PWA focused | Pending |
| Use PWA first | Mobile installability without native app overhead | Pending |
| Use Caveat Brush for brand and Inter for UI | Brand can feel handmade; app data must stay legible | Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition**:
1. Requirements invalidated? Move to Out of Scope with reason.
2. Requirements validated? Move to Validated with phase reference.
3. New requirements emerged? Add to Active.
4. Decisions to log? Add to Key Decisions.
5. "What This Is" still accurate? Update if drifted.

**After each milestone**:
1. Full review of all sections.
2. Core Value check - still the right priority?
3. Audit Out of Scope - reasons still valid?
4. Update Context with current state.

---
*Last updated: 2026-04-30 after initialization*
