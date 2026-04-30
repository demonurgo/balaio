import cors from "@fastify/cors";
import Fastify from "fastify";
import { closeDb } from "./db/client.js";
import { env } from "./env.js";
import { createRealtime } from "./realtime/index.js";
import { registerFairRoutes } from "./routes/fairs.js";
import { registerHealthRoutes } from "./routes/health.js";

const app = Fastify({
  logger: true
});

await app.register(cors, {
  origin: env.CORS_ORIGIN,
  credentials: true
});

const io = createRealtime(app.server);

await registerHealthRoutes(app);
await registerFairRoutes(app, io);

const shutdown = async () => {
  app.log.info("Shutting down");
  await io.close();
  await closeDb();
  await app.close();
};

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

await app.listen({
  port: env.API_PORT,
  host: env.API_HOST
});
