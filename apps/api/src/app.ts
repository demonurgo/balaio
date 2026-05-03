import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import { createDbAuthRepository, type AuthRepository } from "./auth/repository.js";
import { env } from "./env.js";
import { createRealtime } from "./realtime/index.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerFairRoutes } from "./routes/fairs.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerStockRoutes } from "./routes/stock.js";

type CreateAppOptions = {
  authRepository?: AuthRepository;
};

export async function createApp(options: CreateAppOptions = {}) {
  const app = Fastify({
    logger: true,
    bodyLimit: 3 * 1024 * 1024
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

  const io = createRealtime(app.server);

  await registerHealthRoutes(app);
  await registerAuthRoutes(app, options.authRepository ?? createDbAuthRepository());
  await registerFairRoutes(app, io);
  await registerStockRoutes(app, io);

  return { app, io };
}
