import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../app.js";
import { closeDb, db } from "../db/client.js";
import { fairItems, fairMembers, fairs, stockItems, users } from "../db/schema.js";
import { bearer, registerUser } from "../test/helpers.js";

vi.mock("../db/client.js", async () => (await import("../test/testDb.js")).createTestDb());

const { resetDb } = (await import("../db/client.js")) as unknown as { resetDb: () => Promise<void> };

describe("account deletion", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = (await createApp()).app;
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await closeDb();
  });

  beforeEach(async () => {
    await resetDb();
  });

  async function createFair(token: string, month: number) {
    const response = await app.inject({
      method: "POST",
      url: "/api/fairs",
      headers: { authorization: `Bearer ${token}` },
      payload: { month, year: 2026, budget: 100 }
    });

    return response.json().data.id as string;
  }

  it("asks for the password again", async () => {
    const maria = await registerUser(app, "Maria");

    const missing = await app.inject({ method: "DELETE", url: "/api/auth/me", headers: bearer(maria), payload: {} });
    const wrong = await app.inject({
      method: "DELETE",
      url: "/api/auth/me",
      headers: bearer(maria),
      payload: { password: "senha-errada" }
    });

    expect(missing.statusCode).toBe(400);
    expect(wrong.statusCode).toBe(400);
    expect(wrong.json().fields.password).toBe("Senha incorreta.");
    expect(await db.select().from(users).where(eq(users.id, maria.id))).toHaveLength(1);
  });

  it("deletes owned fairs and only leaves shared fairs", async () => {
    const maria = await registerUser(app, "Maria");
    const joao = await registerUser(app, "Joao");
    const mariaFair = await createFair(maria.token, 1);
    const joaoFair = await createFair(joao.token, 2);

    await db.insert(fairMembers).values([
      { fairId: mariaFair, userId: joao.id, role: "editor" },
      { fairId: joaoFair, userId: maria.id, role: "editor" }
    ]);

    const itemResponse = await app.inject({
      method: "POST",
      url: `/api/fairs/${joaoFair}/items`,
      headers: bearer(maria),
      payload: { name: "Banana", unitPrice: 5, purchased: true }
    });
    expect(itemResponse.statusCode).toBe(201);

    const response = await app.inject({
      method: "DELETE",
      url: "/api/auth/me",
      headers: bearer(maria),
      payload: { password: maria.password }
    });

    expect(response.statusCode).toBe(200);
    expect(await db.select().from(users).where(eq(users.id, maria.id))).toHaveLength(0);
    expect(await db.select().from(fairs).where(eq(fairs.id, mariaFair))).toHaveLength(0);
    expect(await db.select().from(fairs).where(eq(fairs.id, joaoFair))).toHaveLength(1);
    expect(await db.select().from(fairMembers).where(eq(fairMembers.userId, maria.id))).toHaveLength(0);
    expect(await db.select().from(stockItems).where(eq(stockItems.userId, maria.id))).toHaveLength(0);

    const [item] = await db.select().from(fairItems).where(eq(fairItems.fairId, joaoFair));
    expect(item?.updatedBy).toBeNull();

    const afterDelete = await app.inject({ method: "GET", url: "/api/fairs", headers: bearer(maria) });
    expect(afterDelete.statusCode).toBe(401);

    const joaoFairs = await app.inject({ method: "GET", url: "/api/fairs", headers: bearer(joao) });
    expect(joaoFairs.json().data.fairs.map((fair: { id: string }) => fair.id)).toEqual([joaoFair]);
  });
});
