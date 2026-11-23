import { eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";
import { getSessionUserId } from "./session.js";

/**
 * Returns the authenticated user id, or replies 401. Tokens outlive their
 * user when the account is deleted, so the user must still exist.
 */
export async function requireUser(app: FastifyInstance, request: FastifyRequest, reply: FastifyReply) {
  const userId = await getSessionUserId(app, request);
  const rows = userId ? await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1) : [];

  if (!userId || !rows[0]) {
    reply.code(401).send({ message: "Não autenticado." });
    return null;
  }

  return userId;
}
