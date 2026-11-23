# Balaio — Hetzner

Publicado em 2026-11-23: https://balaio.demonurgo.com

- Área: `/srv/balaio` (`deploy/` com compose e `.env` restrito, `data/postgres`, `releases/<rev>/source`).
- Código: branch `balaio` a partir de `558cc2d` (opção `TRUST_PROXY`).
- Containers: `balaio_db` (Postgres 17), `balaio_api` (Fastify, `TRUST_PROXY=true`) e `balaio_web` (Caddy servindo o PWA e repassando `/api`, `/socket.io` e `/health`). Banco e API ficam só na rede interna `balaio_internal`.
- O proxy `infra_caddy` entra pela rede `balaio_edge`; a rota está em `/srv/minhatirze/infra/caddy/Caddyfile` (backup `Caddyfile.bak-balaio-*`).
- `.env` gerado no servidor: `BALAIO_RELEASE`, `BALAIO_DB_PASSWORD`, `BALAIO_JWT_SECRET`.

## Nova versão

1. Código em `/srv/balaio/releases/<rev>/source`; copiar `Dockerfile` e `web.Caddyfile` de `deploy/` para `releases/<rev>`.
2. `docker build --target build -t balaio-build:<rev> .`, `--target api -t balaio-api:<rev>`, `--target web -t balaio-web:<rev>`.
3. Migrações: `docker run --rm --network balaio_internal -w /app/apps/api -e DATABASE_URL=... balaio-build:<rev> npx drizzle-kit migrate`.
4. Trocar `BALAIO_RELEASE` no `.env` e `docker compose up -d` em `/srv/balaio/deploy`. A imagem anterior fica para reversão.
