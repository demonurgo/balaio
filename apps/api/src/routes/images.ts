import { and, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireUser } from "../auth/requireUser.js";
import { db } from "../db/client.js";
import { fairItems, fairMembers, stockItems, users } from "../db/schema.js";
import { getMembership } from "../fairs/membership.js";
import { decodeDataUrl } from "../images.js";

const imageParamsSchema = z.object({
  kind: z.enum(["items", "stock", "users"]),
  id: z.string().uuid()
});

const otherMember = alias(fairMembers, "other_member");

/** Returns the stored photo when the viewer may see it, or null. */
async function findVisibleImage(kind: "items" | "stock" | "users", id: string, viewerId: string) {
  if (kind === "items") {
    const [item] = await db
      .select({ fairId: fairItems.fairId, imageUrl: fairItems.imageUrl })
      .from(fairItems)
      .where(eq(fairItems.id, id))
      .limit(1);

    return item && (await getMembership(item.fairId, viewerId)) ? item.imageUrl : null;
  }

  if (kind === "stock") {
    const [item] = await db
      .select({ imageUrl: stockItems.imageUrl })
      .from(stockItems)
      .where(and(eq(stockItems.id, id), eq(stockItems.userId, viewerId)))
      .limit(1);

    return item?.imageUrl ?? null;
  }

  if (id !== viewerId) {
    // Profile photos are visible to people who share at least one fair.
    const [shared] = await db
      .select({ fairId: fairMembers.fairId })
      .from(fairMembers)
      .innerJoin(otherMember, eq(otherMember.fairId, fairMembers.fairId))
      .where(and(eq(fairMembers.userId, viewerId), eq(otherMember.userId, id)))
      .limit(1);

    if (!shared) {
      return null;
    }
  }

  const [user] = await db.select({ imageUrl: users.imageUrl }).from(users).where(eq(users.id, id)).limit(1);
  return user?.imageUrl ?? null;
}

export async function registerImageRoutes(app: FastifyInstance) {
  app.get("/api/images/:kind/:id", async (request, reply) => {
    const userId = await requireUser(app, request, reply);

    if (!userId) {
      return;
    }

    const params = imageParamsSchema.safeParse(request.params);
    const stored = params.success ? await findVisibleImage(params.data.kind, params.data.id, userId) : null;
    const image = stored ? decodeDataUrl(stored) : null;

    if (!image) {
      return reply.code(404).send({ message: "Imagem não encontrada." });
    }

    // The link carries ?v=<updatedAt>, so a changed photo gets a new URL.
    return reply
      .header("Content-Type", image.contentType)
      .header("Cache-Control", "private, max-age=31536000, immutable")
      .header("X-Content-Type-Options", "nosniff")
      .header("Content-Security-Policy", "default-src 'none'")
      .send(image.body);
  });
}
