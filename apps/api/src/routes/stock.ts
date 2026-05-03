import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { getSessionUserId } from "../auth/session.js";
import { db } from "../db/client.js";
import { fairs, stockItems, users } from "../db/schema.js";
import type { RealtimeServer } from "../realtime/index.js";

const stockItemParamsSchema = z.object({
  stockItemId: z.string().uuid()
});

const stockItemUpdateSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  quantity: z.number().min(0.01).max(9999).optional(),
  unit: z.string().trim().min(1).max(24).optional(),
  unitPrice: z.number().min(0).max(999999).optional(),
  category: z.string().trim().max(80).nullable().optional(),
  notes: z.string().trim().max(4000).nullable().optional(),
  imageUrl: z.string().max(1_500_000).nullable().optional()
});

type DbStockItem = typeof stockItems.$inferSelect;

export async function registerStockRoutes(app: FastifyInstance, io: RealtimeServer) {
  app.get("/api/stock", async (request, reply) => {
    const userId = await requireUser(app, request, reply);

    if (!userId) {
      return;
    }

    const rows = await db
      .select({
        stock: stockItems,
        fairName: fairs.name,
        consumedByName: users.name
      })
      .from(stockItems)
      .leftJoin(fairs, eq(stockItems.sourceFairId, fairs.id))
      .leftJoin(users, eq(stockItems.consumedBy, users.id))
      .where(eq(stockItems.userId, userId))
      .orderBy(desc(stockItems.updatedAt), desc(stockItems.createdAt));

    return {
      data: rows.map((row) => toStockDto(row.stock, row.fairName, row.consumedByName))
    };
  });

  app.patch("/api/stock/:stockItemId", async (request, reply) => {
    const userId = await requireUser(app, request, reply);

    if (!userId) {
      return;
    }

    const params = stockItemParamsSchema.safeParse(request.params);
    const parsed = stockItemUpdateSchema.safeParse(request.body);

    if (!params.success || !parsed.success) {
      return reply.code(400).send({ message: "Dados do item de estoque inválidos." });
    }

    const current = await db
      .select()
      .from(stockItems)
      .where(and(eq(stockItems.id, params.data.stockItemId), eq(stockItems.userId, userId)))
      .limit(1);

    if (!current[0]) {
      return reply.code(404).send({ message: "Item de estoque não encontrado." });
    }

    const quantity = parsed.data.quantity ?? toNumber(current[0].quantity);
    const unitPrice = parsed.data.unitPrice ?? toNumber(current[0].unitPrice);
    const patch: Partial<typeof stockItems.$inferInsert> = {
      updatedAt: new Date(),
      totalPrice: toDbNumber(quantity * unitPrice)
    };

    if (parsed.data.name !== undefined) patch.name = parsed.data.name;
    if (parsed.data.quantity !== undefined) patch.quantity = toDbNumber(parsed.data.quantity);
    if (parsed.data.unit !== undefined) patch.unit = parsed.data.unit;
    if (parsed.data.unitPrice !== undefined) patch.unitPrice = toDbNumber(parsed.data.unitPrice);
    if (parsed.data.category !== undefined) patch.category = parsed.data.category;
    if (parsed.data.notes !== undefined) patch.notes = parsed.data.notes;
    if (parsed.data.imageUrl !== undefined) patch.imageUrl = parsed.data.imageUrl;

    const [item] = await db
      .update(stockItems)
      .set(patch)
      .where(and(eq(stockItems.id, params.data.stockItemId), eq(stockItems.userId, userId)))
      .returning();

    if (!item) {
      return reply.code(404).send({ message: "Item de estoque não encontrado." });
    }

    io.emit("stock:updated", { changedBy: userId });
    return { data: toStockDto(item, null, null) };
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
      .set({ status: "consumed", consumedAt: new Date(), consumedBy: userId, updatedAt: new Date() })
      .where(and(eq(stockItems.id, params.data.stockItemId), eq(stockItems.userId, userId)))
      .returning();

    if (!item) {
      return reply.code(404).send({ message: "Item de estoque não encontrado." });
    }

    io.emit("stock:updated", { changedBy: userId });
    return { data: toStockDto(item, null, null) };
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
      .set({ status: "in_stock", consumedAt: null, consumedBy: null, updatedAt: new Date() })
      .where(and(eq(stockItems.id, params.data.stockItemId), eq(stockItems.userId, userId)))
      .returning();

    if (!item) {
      return reply.code(404).send({ message: "Item de estoque não encontrado." });
    }

    io.emit("stock:updated", { changedBy: userId });
    return { data: toStockDto(item, null, null) };
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

function toStockDto(item: DbStockItem, fairName: string | null, consumedByName: string | null) {
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
    consumedBy: item.consumedBy,
    consumedByName,
    consumedAt: item.consumedAt?.toISOString() ?? null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString()
  };
}

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toDbNumber(value: number) {
  return Number(value || 0).toFixed(2);
}
