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

## Planning

GSD artifacts live in `.planning/`.

Current next step: `/gsd-plan-phase 1`.
