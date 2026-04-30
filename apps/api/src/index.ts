import { createApp } from "./app.js";
import { closeDb } from "./db/client.js";
import { env } from "./env.js";

const { app, io } = await createApp();

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
