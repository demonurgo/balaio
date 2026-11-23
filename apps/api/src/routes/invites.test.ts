import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../app.js";
import { closeDb, db } from "../db/client.js";
import { fairInvites } from "../db/schema.js";
import { bearer, registerUser, type TestUser } from "../test/helpers.js";

vi.mock("../db/client.js", async () => (await import("../test/testDb.js")).createTestDb());

const { resetDb } = (await import("../db/client.js")) as unknown as { resetDb: () => Promise<void> };

describe("fair invites and members", () => {
  let app: FastifyInstance;
  let owner: TestUser;
  let guest: TestUser;
  let fairId: string;

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
    owner = await registerUser(app, "Maria");
    guest = await registerUser(app, "Joao");

    const response = await app.inject({
      method: "POST",
      url: "/api/fairs",
      headers: bearer(owner),
      payload: { month: 3, year: 2026, budget: 300 }
    });
    fairId = response.json().data.id;
  });

  async function createInvite(user = owner) {
    return app.inject({ method: "POST", url: `/api/fairs/${fairId}/invites`, headers: bearer(user) });
  }

  async function listMembers(user: TestUser) {
    return app.inject({ method: "GET", url: `/api/fairs/${fairId}/members`, headers: bearer(user) });
  }

  it("lets only the owner create an invite and reuses the valid one", async () => {
    const first = await createInvite();
    const second = await createInvite();
    const notOwner = await createInvite(guest);

    expect(first.statusCode).toBe(201);
    expect(first.json().data.url).toBe(`http://localhost:5173/convite/${first.json().data.code}`);
    expect(second.json().data.code).toBe(first.json().data.code);
    expect(notOwner.statusCode).toBe(403);
  });

  it("shows a preview and lets a guest join with the code", async () => {
    const { code } = (await createInvite()).json().data;

    const anonymousPreview = await app.inject({ method: "GET", url: `/api/invites/${code}` });
    expect(anonymousPreview.statusCode).toBe(200);
    expect(anonymousPreview.json().data).toMatchObject({
      fair: { id: fairId, memberCount: 1 },
      owner: { firstName: "Maria" },
      alreadyMember: false
    });

    expect((await listMembers(guest)).statusCode).toBe(403);

    const accept = await app.inject({ method: "POST", url: `/api/invites/${code}/accept`, headers: bearer(guest) });
    expect(accept.statusCode).toBe(200);
    expect(accept.json().data).toEqual({ fairId, alreadyMember: false });

    const again = await app.inject({ method: "POST", url: `/api/invites/${code}/accept`, headers: bearer(guest) });
    expect(again.json().data.alreadyMember).toBe(true);

    const preview = await app.inject({ method: "GET", url: `/api/invites/${code}`, headers: bearer(guest) });
    expect(preview.json().data.alreadyMember).toBe(true);

    const members = (await listMembers(guest)).json().data;
    expect(members.map((member: { userId: string; role: string; isMe: boolean }) => [member.userId, member.role, member.isMe])).toEqual([
      [owner.id, "owner", false],
      [guest.id, "editor", true]
    ]);

    const guestFairs = await app.inject({ method: "GET", url: "/api/fairs", headers: bearer(guest) });
    expect(guestFairs.json().data.fairs.map((fair: { id: string }) => fair.id)).toContain(fairId);

    const item = await app.inject({
      method: "POST",
      url: `/api/fairs/${fairId}/items`,
      headers: bearer(guest),
      payload: { name: "Tomate", unitPrice: 8 }
    });
    expect(item.statusCode).toBe(201);
  });

  it("rejects unknown and expired invites", async () => {
    const { code } = (await createInvite()).json().data;
    await db.update(fairInvites).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(fairInvites.code, code));

    expect((await app.inject({ method: "GET", url: "/api/invites/naoexiste123" })).statusCode).toBe(404);
    expect((await app.inject({ method: "GET", url: `/api/invites/${code}` })).statusCode).toBe(410);
    expect(
      (await app.inject({ method: "POST", url: `/api/invites/${code}/accept`, headers: bearer(guest) })).statusCode
    ).toBe(410);

    const fresh = await createInvite();
    expect(fresh.statusCode).toBe(201);
    expect(fresh.json().data.code).not.toBe(code);
  });

  it("requires login to accept", async () => {
    const { code } = (await createInvite()).json().data;
    const response = await app.inject({ method: "POST", url: `/api/invites/${code}/accept` });

    expect(response.statusCode).toBe(401);
  });

  it("lets the owner remove members and members leave, but not the owner", async () => {
    const third = await registerUser(app, "Ana");
    const { code } = (await createInvite()).json().data;

    for (const user of [guest, third]) {
      await app.inject({ method: "POST", url: `/api/invites/${code}/accept`, headers: bearer(user) });
    }

    const removeByGuest = await app.inject({
      method: "DELETE",
      url: `/api/fairs/${fairId}/members/${third.id}`,
      headers: bearer(guest)
    });
    expect(removeByGuest.statusCode).toBe(403);

    const removeOwner = await app.inject({
      method: "DELETE",
      url: `/api/fairs/${fairId}/members/${owner.id}`,
      headers: bearer(owner)
    });
    expect(removeOwner.statusCode).toBe(400);

    const removeByOwner = await app.inject({
      method: "DELETE",
      url: `/api/fairs/${fairId}/members/${third.id}`,
      headers: bearer(owner)
    });
    expect(removeByOwner.statusCode).toBe(200);

    const leave = await app.inject({
      method: "DELETE",
      url: `/api/fairs/${fairId}/members/${guest.id}`,
      headers: bearer(guest)
    });
    expect(leave.statusCode).toBe(200);

    const members = (await listMembers(owner)).json().data;
    expect(members.map((member: { userId: string }) => member.userId)).toEqual([owner.id]);
    expect((await listMembers(guest)).statusCode).toBe(403);
  });
});
