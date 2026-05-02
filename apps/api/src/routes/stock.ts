import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { getSessionUserId } from "../auth/session.js";
import { db } from "../db/client.js";
import { fairs, stockItems } from "../db/schema.js";

const stockItemParamsSchema = z.object({
  stockItemId: z.string().uuid()
});

type DbStockItem = typeof stockItems.$inferSelect;

export async function registerStockRoutes(app: FastifyInstance) {
  app.get("/api/stock", async (request, reply) => {
    const userId = await requireUser(app, request, reply);

    if (!userId) {
      return;
    }

    const rows = await db
      .select({
        stock: stockItems,
        fairName: fairs.name
      })
      .from(stockItems)
      .leftJoin(fairs, eq(stockItems.sourceFairId, fairs.id))
      .where(eq(stockItems.userId, userId))
      .orderBy(desc(stockItems.updatedAt), desc(stockItems.createdAt));

    return {
      data: rows.map((row) => toStockDto(row.stock, row.fairName))
    };
  });

  app.patch("/api/stock/:stockItemId/consume", async (request, reply) => {
    const userId = await requireUser(app, request, reply);

    if (!userId) {
      return;
    }

    const params = stockItemParamsSchema.safeParse(request.params);

    if (!params.success) {
      return reply.code(400).send({ message: "Item de estoque inválido." });
    }

    const [item] = await db
      .update(stockItems)
      .set({ status: "consumed", consumedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(stockItems.id, params.data.stockItemId), eq(stockItems.userId, userId)))
      .returning();

    if (!item) {
      return reply.code(404).send({ message: "Item de estoque não encontrado." });
    }

    return { data: toStockDto(item, null) };
  });

  app.patch("/api/stock/:stockItemId/restore", async (request, reply) => {
    const userId = await requireUser(app, request, reply);

    if (!userId) {
      return;
    }

    const params = stockItemParamsSchema.safeParse(request.params);

    if (!params.success) {
      return reply.code(400).send({ message: "Item de estoque inválido." });
    }

    const [item] = await db
      .update(stockItems)
      .set({ status: "in_stock", consumedAt: null, updatedAt: new Date() })
      .where(and(eq(stockItems.id, params.data.stockItemId), eq(stockItems.userId, userId)))
      .returning();

    if (!item) {
      return reply.code(404).send({ message: "Item de estoque não encontrado." });
    }

    return { data: toStockDto(item, null) };
  });
}

async function requireUser(app: FastifyInstance, request: FastifyRequest, reply: FastifyReply) {
  const userId = await getSessionUserId(app, request);

  if (!userId) {
    reply.code(401).send({ message: "Não autenticado." });
    return null;
  }

  return userId;
}

function toStockDto(item: DbStockItem, fairName: string | null) {
  return {
    id: item.id,
    name: item.name,
    quantity: toNumber(item.quantity),
    unit: item.unit,
    unitPrice: toNumber(item.unitPrice),
    totalPrice: toNumber(item.totalPrice),
    category: item.category,
    notes: item.notes,
    imageUrl: item.imageUrl,
    status: item.status,
    sourceFairId: item.sourceFairId,
    sourceFairItemId: item.sourceFairItemId,
    sourceFairName: fairName,
    consumedAt: item.consumedAt?.toISOString() ?? null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString()
  };
}

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
