# Balaio — Hetzner

Publicado em 2026-11-23: https://balaio.demonurgo.com

- Área: `/srv/balaio` (`deploy/` com compose e `.env` restrito, `data/postgres`, `releases/<rev>/source`).
- Código: branch `balaio` a partir de `558cc2d` (opção `TRUST_PROXY`).
- 2026-11-23: release `3bfbec8-ios` (PR #1, branch `fase1-app-ios`) com a migração `0006_fair_invites`. Backup antes da migração em `/srv/balaio/backups/balaio-antes-3bfbec8-ios.sql.gz`; `compose.yaml` e `.env` anteriores em `deploy/*.bak-c38a5c1-proxy`. Reverter: `BALAIO_RELEASE=c38a5c1-proxy` e `docker compose up -d`.
- Containers: `balaio_db` (Postgres 17), `balaio_api` (Fastify, `TRUST_PROXY=true`) e `balaio_web` (Caddy servindo o PWA e repassando `/api`, `/socket.io` e `/health`). Banco e API ficam só na rede interna `balaio_internal`.
- O proxy `infra_caddy` entra pela rede `balaio_edge`; a rota está em `/srv/minhatirze/infra/caddy/Caddyfile` (backup `Caddyfile.bak-balaio-*`).
- `.env` gerado no servidor: `BALAIO_RELEASE`, `BALAIO_DB_PASSWORD`, `BALAIO_JWT_SECRET`.

## Nova versão

1. Código em `/srv/balaio/releases/<rev>/source`; copiar `Dockerfile` e `web.Caddyfile` de `deploy/` para `releases/<rev>`.
2. `docker build --target build -t balaio-build:<rev> .`, `--target api -t balaio-api:<rev>`, `--target web -t balaio-web:<rev>`.
3. Migrações: `docker run --rm --network balaio_internal -w /app/apps/api -e DATABASE_URL=... balaio-build:<rev> npx drizzle-kit migrate`.
4. Trocar `BALAIO_RELEASE` no `.env` e `docker compose up -d` em `/srv/balaio/deploy`. A imagem anterior fica para reversão.

## App iOS (Fase 1 do app nativo)

- Login e cadastro devolvem `token` (Bearer, 90 dias, `AUTH_TOKEN_DAYS`); o cookie do PWA continua igual.
- Migração `0006_fair_invites`: cria `fair_invites` e acerta o padrão de `fair_items.pricing_mode` para `'total'`. Não apaga dados; rodar o passo 3 antes de subir a API nova.
- `PUBLIC_APP_URL` (no `compose.yaml`) monta os links de convite `https://balaio.demonurgo.com/convite/<código>`.
- O `web.Caddyfile` serve `/.well-known/apple-app-site-association` (Universal Links do app `N22KX96K9X.com.demonurgo.balaio`) e as páginas `/privacidade` e `/suporte`. Conferir depois do deploy:
  `curl -i https://balaio.demonurgo.com/.well-known/apple-app-site-association` (200, `application/json`, sem redirecionamento).
- O Socket.IO passa a exigir sessão: o PWA usa o cookie e o app manda o token em `auth.token`.
