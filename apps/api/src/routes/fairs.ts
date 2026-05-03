import { and, count, desc, eq, inArray } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { getSessionUserId } from "../auth/session.js";
import { db } from "../db/client.js";
import { fairItems, fairMembers, fairs, stockItems } from "../db/schema.js";
import { fairRoom, type RealtimeServer } from "../realtime/index.js";

const monthNames = [
  "Janeiro",
  "Fevereiro",
  "Marco",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro"
];

const fairParamsSchema = z.object({
  fairId: z.string().uuid()
});

const itemParamsSchema = fairParamsSchema.extend({
  itemId: z.string().uuid()
});

const fairCreateSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
  budget: z.number().min(0).max(999999).default(0)
});

const fairUpdateSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  month: z.number().int().min(1).max(12).optional(),
  year: z.number().int().min(2020).max(2100).optional(),
  budget: z.number().min(0).max(999999).optional()
});

const itemCreateSchema = z.object({
  name: z.string().trim().min(1).max(160),
  quantity: z.number().min(0.01).max(9999).default(1),
  unit: z.string().trim().min(1).max(24).default("un"),
  unitPrice: z.number().min(0).max(999999).default(0),
  purchased: z.boolean().default(false),
  category: z.string().trim().max(80).nullable().optional(),
  notes: z.string().trim().max(4000).nullable().optional(),
  imageUrl: z.string().max(1_500_000).nullable().optional()
});

const itemUpdateSchema = itemCreateSchema.partial();

type DbFair = typeof fairs.$inferSelect;
type DbItem = typeof fairItems.$inferSelect;

export async function registerFairRoutes(app: FastifyInstance, io: RealtimeServer) {
  app.get("/api/fairs", async (request, reply) => {
    const userId = await requireUser(app, request, reply);

    if (!userId) {
      return;
    }

    const data = await listFairsForUser(userId);
    return { data };
  });

  app.post("/api/fairs", async (request, reply) => {
    const userId = await requireUser(app, request, reply);

    if (!userId) {
      return;
    }

    const parsed = fairCreateSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ message: "Dados da feira invalidos." });
    }

    const name = parsed.data.name ?? `${monthNames[parsed.data.month - 1] ?? "Feira"} ${parsed.data.year}`;
    const existing = await db
      .select({ id: fairs.id })
      .from(fairs)
      .where(and(eq(fairs.ownerId, userId), eq(fairs.month, parsed.data.month), eq(fairs.year, parsed.data.year)))
      .limit(1);

    if (existing[0]) {
      return reply.code(409).send({ message: "Ja existe uma feira para esse mes." });
    }

    const [fair] = await db
      .insert(fairs)
      .values({
        ownerId: userId,
        name,
        month: parsed.data.month,
        year: parsed.data.year,
        budget: toDbNumber(parsed.data.budget)
      })
      .returning();

    if (!fair) {
      return reply.code(500).send({ message: "Nao foi possivel criar a feira." });
    }

    await db.insert(fairMembers).values({ fairId: fair.id, userId, role: "owner" });

    return reply.code(201).send({ data: toFairSummary(fair, 1, 0) });
  });

  app.patch("/api/fairs/:fairId", async (request, reply) => {
    const userId = await requireUser(app, request, reply);

    if (!userId) {
      return;
    }

    const params = fairParamsSchema.safeParse(request.params);
    const parsed = fairUpdateSchema.safeParse(request.body);

    if (!params.success || !parsed.success) {
      return reply.code(400).send({ message: "Dados da feira invalidos." });
    }

    const membership = await getMembership(params.data.fairId, userId);

    if (!membership || membership.role === "viewer") {
      return reply.code(403).send({ message: "Sem permissao para editar essa feira." });
    }

    const patch: Partial<typeof fairs.$inferInsert> = {
      updatedAt: new Date()
    };

    if (parsed.data.name !== undefined) patch.name = parsed.data.name;
    if (parsed.data.month !== undefined) patch.month = parsed.data.month;
    if (parsed.data.year !== undefined) patch.year = parsed.data.year;
    if (parsed.data.budget !== undefined) patch.budget = toDbNumber(parsed.data.budget);

    const [fair] = await db.update(fairs).set(patch).where(eq(fairs.id, params.data.fairId)).returning();

    if (!fair) {
      return reply.code(404).send({ message: "Feira nao encontrada." });
    }

    const data = await hydrateFairSummary(fair);

    io.to(fairRoom(fair.id)).emit("fair:updated", { fairId: fair.id });
    return { data };
  });

  app.delete("/api/fairs/:fairId", async (request, reply) => {
    const userId = await requireUser(app, request, reply);

    if (!userId) {
      return;
    }

    const params = fairParamsSchema.safeParse(request.params);

    if (!params.success) {
      return reply.code(400).send({ message: "Feira invalida." });
    }

    const membership = await getMembership(params.data.fairId, userId);

    if (!membership || membership.role !== "owner") {
      return reply.code(403).send({ message: "Somente o dono pode excluir a feira." });
    }

    await db.delete(fairs).where(eq(fairs.id, params.data.fairId));
    io.to(fairRoom(params.data.fairId)).emit("fair:deleted", { fairId: params.data.fairId });

    return { ok: true };
  });

  app.post("/api/fairs/:fairId/items", async (request, reply) => {
    const userId = await requireUser(app, request, reply);

    if (!userId) {
      return;
    }

    const params = fairParamsSchema.safeParse(request.params);
    const parsed = itemCreateSchema.safeParse(request.body);

    if (!params.success || !parsed.success) {
      return reply.code(400).send({ message: "Dados do item invalidos." });
    }

    const membership = await getMembership(params.data.fairId, userId);

    if (!membership || membership.role === "viewer") {
      return reply.code(403).send({ message: "Sem permissao para editar essa feira." });
    }

    const [{ value: positionCount } = { value: 0 }] = await db
      .select({ value: count() })
      .from(fairItems)
      .where(eq(fairItems.fairId, params.data.fairId));
    const totalPrice = parsed.data.quantity * parsed.data.unitPrice;
    const [item] = await db
      .insert(fairItems)
      .values({
        fairId: params.data.fairId,
        name: parsed.data.name,
        quantity: toDbNumber(parsed.data.quantity),
        unit: parsed.data.unit,
        unitPrice: toDbNumber(parsed.data.unitPrice),
        totalPrice: toDbNumber(totalPrice),
        purchased: parsed.data.purchased,
        category: parsed.data.category ?? null,
        notes: parsed.data.notes ?? null,
        imageUrl: parsed.data.imageUrl ?? null,
        position: Number(positionCount),
        updatedBy: userId
      })
      .returning();

    if (!item) {
      return reply.code(500).send({ message: "Nao foi possivel criar o item." });
    }

    if (item.purchased) {
      await upsertStockItem(userId, item);
      io.emit("stock:updated", { changedBy: userId });
    }

    io.to(fairRoom(params.data.fairId)).emit("item:created", { fairId: params.data.fairId, itemId: item.id });

    return reply.code(201).send({ data: toItemDto(item) });
  });

  app.patch("/api/fairs/:fairId/items/:itemId", async (request, reply) => {
    const userId = await requireUser(app, request, reply);

    if (!userId) {
      return;
    }

    const params = itemParamsSchema.safeParse(request.params);
    const parsed = itemUpdateSchema.safeParse(request.body);

    if (!params.success || !parsed.success) {
      return reply.code(400).send({ message: "Dados do item invalidos." });
    }

    const membership = await getMembership(params.data.fairId, userId);

    if (!membership || membership.role === "viewer") {
      return reply.code(403).send({ message: "Sem permissao para editar essa feira." });
    }

    const current = await db
      .select()
      .from(fairItems)
      .where(and(eq(fairItems.id, params.data.itemId), eq(fairItems.fairId, params.data.fairId)))
      .limit(1);

    if (!current[0]) {
      return reply.code(404).send({ message: "Item nao encontrado." });
    }

    const quantity = parsed.data.quantity ?? toNumber(current[0].quantity);
    const unitPrice = parsed.data.unitPrice ?? toNumber(current[0].unitPrice);
    const patch: Partial<typeof fairItems.$inferInsert> = {
      updatedAt: new Date(),
      updatedBy: userId,
      totalPrice: toDbNumber(quantity * unitPrice)
    };

    if (parsed.data.name !== undefined) patch.name = parsed.data.name;
    if (parsed.data.quantity !== undefined) patch.quantity = toDbNumber(parsed.data.quantity);
    if (parsed.data.unit !== undefined) patch.unit = parsed.data.unit;
    if (parsed.data.unitPrice !== undefined) patch.unitPrice = toDbNumber(parsed.data.unitPrice);
    if (parsed.data.purchased !== undefined) patch.purchased = parsed.data.purchased;
    if (parsed.data.category !== undefined) patch.category = parsed.data.category;
    if (parsed.data.notes !== undefined) patch.notes = parsed.data.notes;
    if (parsed.data.imageUrl !== undefined) patch.imageUrl = parsed.data.imageUrl;

    const [item] = await db
      .update(fairItems)
      .set(patch)
      .where(and(eq(fairItems.id, params.data.itemId), eq(fairItems.fairId, params.data.fairId)))
      .returning();

    if (!item) {
      return reply.code(404).send({ message: "Item nao encontrado." });
    }

    if (item.purchased) {
      await upsertStockItem(userId, item);
      io.emit("stock:updated", { changedBy: userId });
    }

    io.to(fairRoom(params.data.fairId)).emit("item:updated", { fairId: params.data.fairId, itemId: item.id });

    return { data: toItemDto(item) };
  });

  app.delete("/api/fairs/:fairId/items/:itemId", async (request, reply) => {
    const userId = await requireUser(app, request, reply);

    if (!userId) {
      return;
    }

    const params = itemParamsSchema.safeParse(request.params);

    if (!params.success) {
      return reply.code(400).send({ message: "Item invalido." });
    }

    const membership = await getMembership(params.data.fairId, userId);

    if (!membership || membership.role === "viewer") {
      return reply.code(403).send({ message: "Sem permissao para editar essa feira." });
    }

    await db.delete(fairItems).where(and(eq(fairItems.id, params.data.itemId), eq(fairItems.fairId, params.data.fairId)));
    io.to(fairRoom(params.data.fairId)).emit("item:deleted", { fairId: params.data.fairId, itemId: params.data.itemId });

    return { ok: true };
  });

  app.post("/api/fairs/:fairId/realtime-test", async (request, reply) => {
    const parsed = fairParamsSchema.safeParse(request.params);

    if (!parsed.success) {
      return reply.code(400).send({
        error: "Invalid fair id"
      });
    }

    io.to(fairRoom(parsed.data.fairId)).emit("item:updated", {
      fairId: parsed.data.fairId,
      itemId: "00000000-0000-0000-0000-000000000000"
    });

    return {
      ok: true
    };
  });
}

async function requireUser(app: FastifyInstance, request: FastifyRequest, reply: FastifyReply) {
  const userId = await getSessionUserId(app, request);

  if (!userId) {
    reply.code(401).send({ message: "Nao autenticado." });
    return null;
  }

  return userId;
}

async function getMembership(fairId: string, userId: string) {
  const rows = await db
    .select({ role: fairMembers.role })
    .from(fairMembers)
    .where(and(eq(fairMembers.fairId, fairId), eq(fairMembers.userId, userId)))
    .limit(1);

  return rows[0] ?? null;
}

async function listFairsForUser(userId: string) {
  let userFairs = await selectUserFairs(userId);

  if (userFairs.length === 0) {
    await createDefaultFair(userId);
    userFairs = await selectUserFairs(userId);
  }

  const fairIds = userFairs.map((fair) => fair.id);

  if (fairIds.length === 0) {
    return { fairs: [], itemsByFair: {} };
  }

  const items = await db
    .select()
    .from(fairItems)
    .where(inArray(fairItems.fairId, fairIds))
    .orderBy(fairItems.position, fairItems.createdAt);
  const members = await db
    .select({ fairId: fairMembers.fairId, value: count() })
    .from(fairMembers)
    .where(inArray(fairMembers.fairId, fairIds))
    .groupBy(fairMembers.fairId);
  const totalByFair = new Map<string, number>();
  const countByFair = new Map(members.map((member) => [member.fairId, Number(member.value)]));
  const itemsByFair = items.reduce<Record<string, ReturnType<typeof toItemDto>[]>>((acc, item) => {
    const bucket = acc[item.fairId] ?? [];
    bucket.push(toItemDto(item));
    acc[item.fairId] = bucket;
    totalByFair.set(item.fairId, (totalByFair.get(item.fairId) ?? 0) + toNumber(item.totalPrice));
    return acc;
  }, {});

  return {
    fairs: userFairs.map((fair) => toFairSummary(fair, countByFair.get(fair.id) ?? 1, totalByFair.get(fair.id) ?? 0)),
    itemsByFair
  };
}

async function selectUserFairs(userId: string) {
  return db
    .select({
      id: fairs.id,
      ownerId: fairs.ownerId,
      name: fairs.name,
      month: fairs.month,
      year: fairs.year,
      budget: fairs.budget,
      createdAt: fairs.createdAt,
      updatedAt: fairs.updatedAt
    })
    .from(fairMembers)
    .innerJoin(fairs, eq(fairMembers.fairId, fairs.id))
    .where(eq(fairMembers.userId, userId))
    .orderBy(desc(fairs.year), desc(fairs.month), desc(fairs.updatedAt));
}

async function createDefaultFair(userId: string) {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const [existing] = await db
    .select({ id: fairs.id })
    .from(fairs)
    .where(and(eq(fairs.ownerId, userId), eq(fairs.month, month), eq(fairs.year, year)))
    .limit(1);

  if (existing) {
    await db.insert(fairMembers).values({ fairId: existing.id, userId, role: "owner" }).onConflictDoNothing();
    return;
  }

  const [fair] = await db
    .insert(fairs)
    .values({
      ownerId: userId,
      name: `${monthNames[month - 1] ?? "Feira"} ${year}`,
      month,
      year,
      budget: "0"
    })
    .returning();

  if (!fair) {
    return;
  }

  await db.insert(fairMembers).values({ fairId: fair.id, userId, role: "owner" }).onConflictDoNothing();
}

async function hydrateFairSummary(fair: DbFair) {
  const [memberCount] = await db
    .select({ value: count() })
    .from(fairMembers)
    .where(eq(fairMembers.fairId, fair.id));
  const items = await db.select({ totalPrice: fairItems.totalPrice }).from(fairItems).where(eq(fairItems.fairId, fair.id));
  const total = items.reduce((sum, item) => sum + toNumber(item.totalPrice), 0);

  return toFairSummary(fair, Number(memberCount?.value ?? 1), total);
}

function toFairSummary(fair: DbFair, memberCount: number, total: number) {
  return {
    id: fair.id,
    name: fair.name,
    month: fair.month,
    year: fair.year,
    budget: toNumber(fair.budget),
    total: Number(total.toFixed(2)),
    memberCount
  };
}

function toItemDto(item: DbItem) {
  return {
    id: item.id,
    fairId: item.fairId,
    name: item.name,
    quantity: toNumber(item.quantity),
    unit: item.unit,
    unitPrice: toNumber(item.unitPrice),
    totalPrice: toNumber(item.totalPrice),
    purchased: item.purchased,
    category: item.category,
    notes: item.notes,
    imageUrl: item.imageUrl
  };
}

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toDbNumber(value: number) {
  return Number(value || 0).toFixed(2);
}

async function upsertStockItem(userId: string, item: DbItem) {
  const values = {
    userId,
    sourceFairId: item.fairId,
    sourceFairItemId: item.id,
    name: item.name,
    quantity: item.quantity,
    unit: item.unit,
    unitPrice: item.unitPrice,
    totalPrice: item.totalPrice,
    category: item.category,
    notes: item.notes,
    imageUrl: item.imageUrl,
    status: "in_stock" as const,
    consumedAt: null,
    updatedAt: new Date()
  };

  await db
    .insert(stockItems)
    .values(values)
    .onConflictDoUpdate({
      target: [stockItems.userId, stockItems.sourceFairItemId],
      set: values
    });
}
