# Built from /srv/balaio/releases/<rev>/source
FROM node:22.22.1-bookworm-slim AS build
WORKDIR /app
COPY source/ ./
RUN npm ci --no-audit --no-fund
# Same-origin deploy: the web app calls /api and /socket.io on its own host.
ENV VITE_API_URL= VITE_SOCKET_URL=
RUN npm run build

FROM node:22.22.1-bookworm-slim AS api
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build --chown=node:node /app /app
USER node
EXPOSE 3333
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD node -e "fetch('http://127.0.0.1:3333/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "apps/api/dist/index.js"]

FROM caddy:2.8.4-alpine AS web
COPY web.Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/apps/web/dist /srv
