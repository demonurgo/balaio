import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import { createDbAuthRepository, type AuthRepository } from "./auth/repository.js";
import { readBearerToken, verifySessionToken } from "./auth/session.js";
import { env } from "./env.js";
import { getMembership } from "./fairs/membership.js";
import { createRealtime } from "./realtime/index.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerFairRoutes } from "./routes/fairs.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerImageRoutes } from "./routes/images.js";
import { registerInviteRoutes } from "./routes/invites.js";
import { registerStockRoutes } from "./routes/stock.js";

type CreateAppOptions = {
  authRepository?: AuthRepository;
};

export async function createApp(options: CreateAppOptions = {}) {
  const app = Fastify({
    logger: true,
    bodyLimit: 3 * 1024 * 1024,
    trustProxy: env.TRUST_PROXY
  });

  await app.register(cors, {
    origin: env.CORS_ORIGIN,
    credentials: true
  });

  await app.register(cookie);
  await app.register(jwt, {
    secret: env.JWT_SECRET
  });
  await app.register(rateLimit, {
    global: false,
    hook: "preHandler",
    errorResponseBuilder: (_request, context) => ({
      statusCode: 429,
      error: "Too Many Requests",
      message: "Muitas tentativas. Tente novamente em alguns instantes.",
      retryAfter: context.after
    })
  });

  const authRepository = options.authRepository ?? createDbAuthRepository();
  const io = createRealtime(app.server, {
    async authenticate({ auth, headers }) {
      const cookies = typeof headers.cookie === "string" ? app.parseCookie(headers.cookie) : {};
      const authorization = typeof headers.authorization === "string" ? readBearerToken(headers.authorization) : null;
      const token =
        (typeof auth.token === "string" && auth.token) || authorization || cookies[env.AUTH_COOKIE_NAME];

      if (!token) {
        return null;
      }

      const userId = await verifySessionToken(app, token);
      return userId && (await authRepository.findUserById(userId)) ? userId : null;
    },
    async isMember(fairId, userId) {
      return (await getMembership(fairId, userId)) !== null;
    }
  });

  await registerHealthRoutes(app);
  await registerAuthRoutes(app, authRepository, io);
  await registerFairRoutes(app, io);
  await registerImageRoutes(app);
  await registerInviteRoutes(app, io);
  await registerStockRoutes(app, io);

  return { app, io };
}
