import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../app.js";
import { closeDb, db } from "../db/client.js";
import { fairMembers } from "../db/schema.js";
import { bearer, registerUser, type TestUser } from "../test/helpers.js";

vi.mock("../db/client.js", async () => (await import("../test/testDb.js")).createTestDb());

const { resetDb } = (await import("../db/client.js")) as unknown as { resetDb: () => Promise<void> };

// 1x1 transparent PNG
const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
const PNG_DATA_URL = `data:image/png;base64,${PNG}`;

describe("fair detail and image links", () => {
  let app: FastifyInstance;
  let maria: TestUser;
  let joao: TestUser;
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
    maria = await registerUser(app, "Maria");
    joao = await registerUser(app, "Joao");
    const response = await app.inject({
      method: "POST",
      url: "/api/fairs",
      headers: bearer(maria),
      payload: { month: 4, year: 2026, budget: 50 }
    });
    fairId = response.json().data.id;
  });

  async function createItemWithPhoto() {
    const response = await app.inject({
      method: "POST",
      url: `/api/fairs/${fairId}/items`,
      headers: bearer(maria),
      payload: { name: "Manga", unitPrice: 4, purchased: true, imageUrl: PNG_DATA_URL }
    });
    return response.json().data as { id: string; imageUrl: string };
  }

  it("returns one fair with its items for members only", async () => {
    const item = await createItemWithPhoto();

    const response = await app.inject({ method: "GET", url: `/api/fairs/${fairId}`, headers: bearer(maria) });
    const body = response.json().data;

    expect(response.statusCode).toBe(200);
    expect(body.fair).toMatchObject({ id: fairId, budget: 50, total: 4, memberCount: 1 });
    expect(body.items.map((entry: { id: string }) => entry.id)).toEqual([item.id]);

    const stranger = await app.inject({ method: "GET", url: `/api/fairs/${fairId}`, headers: bearer(joao) });
    expect(stranger.statusCode).toBe(404);
  });

  it("sends photos as links and serves them only to who can see them", async () => {
    const item = await createItemWithPhoto();

    expect(item.imageUrl).toMatch(new RegExp(`^/api/images/items/${item.id}\\?v=\\d+$`));

    const list = await app.inject({ method: "GET", url: "/api/fairs", headers: bearer(maria) });
    expect(list.body).not.toContain("base64");

    const image = await app.inject({ method: "GET", url: item.imageUrl, headers: bearer(maria) });
    expect(image.statusCode).toBe(200);
    expect(image.headers["content-type"]).toBe("image/png");
    expect(image.rawPayload.equals(Buffer.from(PNG, "base64"))).toBe(true);

    expect((await app.inject({ method: "GET", url: item.imageUrl, headers: bearer(joao) })).statusCode).toBe(404);
    expect((await app.inject({ method: "GET", url: item.imageUrl })).statusCode).toBe(401);

    const stock = (await app.inject({ method: "GET", url: "/api/stock", headers: bearer(maria) })).json().data;
    expect(stock[0].imageUrl).toMatch(/^\/api\/images\/stock\//);
    expect((await app.inject({ method: "GET", url: stock[0].imageUrl, headers: bearer(maria) })).statusCode).toBe(200);
    expect((await app.inject({ method: "GET", url: stock[0].imageUrl, headers: bearer(joao) })).statusCode).toBe(404);
  });

  it("keeps the photo when a client sends the link back", async () => {
    const item = await createItemWithPhoto();

    const patch = await app.inject({
      method: "PATCH",
      url: `/api/fairs/${fairId}/items/${item.id}`,
      headers: bearer(maria),
      payload: { name: "Manga palmer", imageUrl: item.imageUrl }
    });
    const updated = patch.json().data;

    expect(updated.imageUrl).toMatch(new RegExp(`^/api/images/items/${item.id}\\?v=`));
    expect((await app.inject({ method: "GET", url: updated.imageUrl, headers: bearer(maria) })).statusCode).toBe(200);

    const removed = await app.inject({
      method: "PATCH",
      url: `/api/fairs/${fairId}/items/${item.id}`,
      headers: bearer(maria),
      payload: { imageUrl: null }
    });
    expect(removed.json().data.imageUrl).toBeNull();
  });

  it("shows profile photos to people who share a fair", async () => {
    const profile = { firstName: "Maria", lastName: "Teste", birthDate: "1990-01-01", email: maria.email };
    const me = await app.inject({
      method: "PATCH",
      url: "/api/auth/me",
      headers: bearer(maria),
      payload: { ...profile, imageUrl: PNG_DATA_URL }
    });
    const link = me.json().user.imageUrl as string;

    expect(link).toMatch(new RegExp(`^/api/images/users/${maria.id}\\?v=`));
    expect((await app.inject({ method: "GET", url: link, headers: bearer(maria) })).statusCode).toBe(200);
    expect((await app.inject({ method: "GET", url: link, headers: bearer(joao) })).statusCode).toBe(404);

    await db.insert(fairMembers).values({ fairId, userId: joao.id, role: "editor" });
    expect((await app.inject({ method: "GET", url: link, headers: bearer(joao) })).statusCode).toBe(200);

    const echoed = await app.inject({
      method: "PATCH",
      url: "/api/auth/me",
      headers: bearer(maria),
      payload: { ...profile, firstName: "Mara", imageUrl: link }
    });
    expect(echoed.json().user.imageUrl).toMatch(/^\/api\/images\/users\//);
  });

  it("refuses to serve non-raster images", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/api/fairs/${fairId}/items`,
      headers: bearer(maria),
      payload: { name: "Svg", imageUrl: "data:image/svg+xml;base64,PHN2Zy8+" }
    });
    const item = response.json().data;

    expect((await app.inject({ method: "GET", url: item.imageUrl, headers: bearer(maria) })).statusCode).toBe(404);
  });
});
