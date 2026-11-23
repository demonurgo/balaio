import { randomBytes } from "node:crypto";
import { and, asc, count, desc, eq, gt, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireUser } from "../auth/requireUser.js";
import { getSessionUserId } from "../auth/session.js";
import { db } from "../db/client.js";
import { fairInvites, fairMembers, fairs, users } from "../db/schema.js";
import { env } from "../env.js";
import { getMembership } from "../fairs/membership.js";
import { imageLink } from "../images.js";
import { fairRoom, type RealtimeServer, userRoom } from "../realtime/index.js";

const INVITE_DAYS = 7;
/** An existing invite is reused while it still has at least this long left. */
const INVITE_REUSE_MIN_MS = 24 * 60 * 60 * 1000;

const fairParamsSchema = z.object({
  fairId: z.string().uuid()
});

const memberParamsSchema = fairParamsSchema.extend({
  userId: z.string().uuid()
});

const inviteParamsSchema = z.object({
  code: z.string().regex(/^[A-Za-z0-9_-]{8,32}$/)
});

type DbInvite = typeof fairInvites.$inferSelect;

export function inviteUrl(code: string) {
  return `${env.PUBLIC_APP_URL}/convite/${code}`;
}

function createInviteCode() {
  return randomBytes(9).toString("base64url");
}

function toInviteDto(invite: DbInvite) {
  return {
    code: invite.code,
    url: inviteUrl(invite.code),
    role: invite.role,
    expiresAt: invite.expiresAt.toISOString()
  };
}

async function findInvite(code: string) {
  const rows = await db.select().from(fairInvites).where(eq(fairInvites.code, code)).limit(1);
  return rows[0] ?? null;
}

export async function registerInviteRoutes(app: FastifyInstance, io: RealtimeServer) {
  app.post("/api/fairs/:fairId/invites", async (request, reply) => {
    const userId = await requireUser(app, request, reply);

    if (!userId) {
      return;
    }

    const params = fairParamsSchema.safeParse(request.params);

    if (!params.success) {
      return reply.code(400).send({ message: "Feira inválida." });
    }

    const membership = await getMembership(params.data.fairId, userId);

    if (membership?.role !== "owner") {
      return reply.code(403).send({ message: "Somente o dono pode convidar pessoas." });
    }

    const [current] = await db
      .select()
      .from(fairInvites)
      .where(
        and(
          eq(fairInvites.fairId, params.data.fairId),
          gt(fairInvites.expiresAt, new Date(Date.now() + INVITE_REUSE_MIN_MS))
        )
      )
      .orderBy(desc(fairInvites.expiresAt))
      .limit(1);

    if (current) {
      return { data: toInviteDto(current) };
    }

    const [invite] = await db
      .insert(fairInvites)
      .values({
        code: createInviteCode(),
        fairId: params.data.fairId,
        createdBy: userId,
        role: "editor",
        expiresAt: new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000)
      })
      .returning();

    if (!invite) {
      return reply.code(500).send({ message: "Não foi possível criar o convite." });
    }

    return reply.code(201).send({ data: toInviteDto(invite) });
  });

  app.get(
    "/api/invites/:code",
    {
      config: {
        rateLimit: {
          max: 30,
          timeWindow: "1 minute"
        }
      }
    },
    async (request, reply) => {
      const params = inviteParamsSchema.safeParse(request.params);
      const invite = params.success ? await findInvite(params.data.code) : null;

      if (!invite) {
        return reply.code(404).send({ message: "Convite não encontrado." });
      }

      if (invite.expiresAt <= new Date()) {
        return reply.code(410).send({ message: "Este convite expirou. Peça um novo link." });
      }

      const [row] = await db
        .select({
          fairId: fairs.id,
          fairName: fairs.name,
          month: fairs.month,
          year: fairs.year,
          ownerName: users.name,
          ownerFirstName: users.firstName
        })
        .from(fairs)
        .innerJoin(users, eq(fairs.ownerId, users.id))
        .where(eq(fairs.id, invite.fairId))
        .limit(1);

      if (!row) {
        return reply.code(404).send({ message: "Convite não encontrado." });
      }

      const [memberCount] = await db
        .select({ value: count() })
        .from(fairMembers)
        .where(eq(fairMembers.fairId, invite.fairId));
      const viewerId = await getSessionUserId(app, request);
      const alreadyMember = viewerId ? (await getMembership(invite.fairId, viewerId)) !== null : false;

      return {
        data: {
          code: invite.code,
          expiresAt: invite.expiresAt.toISOString(),
          fair: {
            id: row.fairId,
            name: row.fairName,
            month: row.month,
            year: row.year,
            memberCount: Number(memberCount?.value ?? 1)
          },
          owner: {
            name: row.ownerName,
            firstName: row.ownerFirstName || row.ownerName.split(" ")[0] || row.ownerName
          },
          alreadyMember
        }
      };
    }
  );

  app.post(
    "/api/invites/:code/accept",
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: "1 minute"
        }
      }
    },
    async (request, reply) => {
      const userId = await requireUser(app, request, reply);

      if (!userId) {
        return;
      }

      const params = inviteParamsSchema.safeParse(request.params);
      const invite = params.success ? await findInvite(params.data.code) : null;

      if (!invite) {
        return reply.code(404).send({ message: "Convite não encontrado." });
      }

      if (invite.expiresAt <= new Date()) {
        return reply.code(410).send({ message: "Este convite expirou. Peça um novo link." });
      }

      const inserted = await db
        .insert(fairMembers)
        .values({ fairId: invite.fairId, userId, role: invite.role })
        .onConflictDoNothing()
        .returning({ id: fairMembers.id });

      if (inserted.length > 0) {
        io.to(fairRoom(invite.fairId)).emit("fair:updated", { fairId: invite.fairId, changedBy: userId });
      }

      return {
        data: {
          fairId: invite.fairId,
          alreadyMember: inserted.length === 0
        }
      };
    }
  );

  app.get("/api/fairs/:fairId/members", async (request, reply) => {
    const userId = await requireUser(app, request, reply);

    if (!userId) {
      return;
    }

    const params = fairParamsSchema.safeParse(request.params);

    if (!params.success) {
      return reply.code(400).send({ message: "Feira inválida." });
    }

    if (!(await getMembership(params.data.fairId, userId))) {
      return reply.code(403).send({ message: "Você não participa dessa feira." });
    }

    const rows = await db
      .select({
        userId: users.id,
        name: users.name,
        firstName: users.firstName,
        lastName: users.lastName,
        imageUrl: users.imageUrl,
        updatedAt: users.updatedAt,
        role: fairMembers.role,
        joinedAt: fairMembers.createdAt
      })
      .from(fairMembers)
      .innerJoin(users, eq(fairMembers.userId, users.id))
      .where(eq(fairMembers.fairId, params.data.fairId))
      .orderBy(sql`case when ${fairMembers.role} = 'owner' then 0 else 1 end`, asc(fairMembers.createdAt));

    return {
      data: rows.map((row) => ({
        userId: row.userId,
        name: row.name,
        firstName: row.firstName,
        lastName: row.lastName,
        imageUrl: imageLink("users", row.userId, row.imageUrl, row.updatedAt),
        role: row.role,
        isOwner: row.role === "owner",
        isMe: row.userId === userId,
        joinedAt: row.joinedAt.toISOString()
      }))
    };
  });

  app.delete("/api/fairs/:fairId/members/:userId", async (request, reply) => {
    const userId = await requireUser(app, request, reply);

    if (!userId) {
      return;
    }

    const params = memberParamsSchema.safeParse(request.params);

    if (!params.success) {
      return reply.code(400).send({ message: "Membro inválido." });
    }

    const { fairId, userId: targetId } = params.data;
    const membership = await getMembership(fairId, userId);

    if (!membership) {
      return reply.code(403).send({ message: "Você não participa dessa feira." });
    }

    const leaving = targetId === userId;

    if (leaving && membership.role === "owner") {
      return reply.code(400).send({ message: "O dono não pode sair da feira. Exclua a feira se não for mais usar." });
    }

    if (!leaving && membership.role !== "owner") {
      return reply.code(403).send({ message: "Somente o dono pode remover pessoas." });
    }

    const target = leaving ? membership : await getMembership(fairId, targetId);

    if (!target) {
      return reply.code(404).send({ message: "Essa pessoa não participa da feira." });
    }

    if (target.role === "owner") {
      return reply.code(400).send({ message: "O dono não pode ser removido." });
    }

    await db.delete(fairMembers).where(and(eq(fairMembers.fairId, fairId), eq(fairMembers.userId, targetId)));

    // For the person who left, the fair is gone: drop it from their realtime room.
    io.in(userRoom(targetId)).socketsLeave(fairRoom(fairId));
    io.to(userRoom(targetId)).emit("fair:deleted", { fairId, changedBy: userId });
    io.to(fairRoom(fairId)).emit("fair:updated", { fairId, changedBy: userId });

    return { ok: true };
  });
}
