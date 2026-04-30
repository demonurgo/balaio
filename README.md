# Balaio

PWA online para organizar feira mensal, compartilhar com outra pessoa e ver alteracoes em tempo real.

## Stack

- Web: React, Vite, TypeScript, PWA
- API: Fastify, TypeScript
- Realtime: Socket.IO
- Banco: PostgreSQL
- ORM: Drizzle
- Shared: tipos e schemas Zod

## Desenvolvimento

```bash
npm install
docker compose up -d
npm run db:push
npm run dev
```

Web: http://localhost:5173
API: http://localhost:3333

## Estrutura

```txt
apps/
  web/   React PWA
  api/   Fastify API + WebSocket
packages/
  shared/ tipos compartilhados
```
