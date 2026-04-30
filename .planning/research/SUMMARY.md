# Research Summary: Balaio

## Stack

Chosen stack:

- React + Vite + TypeScript for the web/PWA.
- Fastify for low-overhead API routes.
- PostgreSQL as the source of truth.
- Drizzle ORM for schema-first SQL access.
- Socket.IO for realtime feira rooms.
- Zustand for small client state.
- TanStack Query for server data caching and request state.

## Architecture

Use a monorepo:

```txt
apps/web      PWA UI
apps/api      HTTP API + Socket.IO server
packages/shared  shared schemas/types
```

Primary data flow:

1. Web loads feira data through HTTP.
2. Web joins `fair:{id}` Socket.IO room.
3. API validates mutation permissions.
4. API writes PostgreSQL.
5. API emits realtime event to room.
6. Other clients reconcile local view.

## Table Stakes

- Account and session.
- Monthly feira list.
- CRUD items.
- Budget and totals.
- Import previous feira.
- Sharing with permissions.
- Live updates.
- PWA install metadata.

## Pitfalls

- Trusting frontend permissions.
- Duplicating item rows after realtime events.
- Letting price math drift between client and server.
- Using too much hand-written font inside data UI.
- Treating PWA icons as simple square PNGs and forgetting maskable safe area.

## Recommendations

- Server owns permission and price calculations.
- Client can optimistically update, then reconcile by item id.
- Keep item events granular but refetch feira snapshot on mismatch.
- Use Inter for UI and Caveat Brush only for brand.
- Build minimal first; postpone offline and native app.

---
*Research summarized locally: 2026-04-30*
