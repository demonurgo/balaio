import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../app.js";
import { closeDb } from "../db/client.js";
import { bearer, registerUser, type TestUser } from "../test/helpers.js";

vi.mock("../db/client.js", async () => (await import("../test/testDb.js")).createTestDb());

const { resetDb } = (await import("../db/client.js")) as unknown as { resetDb: () => Promise<void> };

describe("stock low threshold", () => {
  let app: FastifyInstance;
  let maria: TestUser;
  let stockId: string;

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
    const fair = await app.inject({
      method: "POST",
      url: "/api/fairs",
      headers: bearer(maria),
      payload: { month: 5, year: 2026, budget: 0 }
    });
    await app.inject({
      method: "POST",
      url: `/api/fairs/${fair.json().data.id}/items`,
      headers: bearer(maria),
      payload: { name: "Arroz", quantity: 3, unitPrice: 5, purchased: true }
    });
    const stock = await app.inject({ method: "GET", url: "/api/stock", headers: bearer(maria) });
    stockId = stock.json().data[0].id;
  });

  it("starts without a threshold, saves one and clears it", async () => {
    const list = await app.inject({ method: "GET", url: "/api/stock", headers: bearer(maria) });
    expect(list.json().data[0].lowStockThreshold).toBeNull();

    const saved = await app.inject({
      method: "PATCH",
      url: `/api/stock/${stockId}`,
      headers: bearer(maria),
      payload: { lowStockThreshold: 1 }
    });
    expect(saved.statusCode).toBe(200);
    expect(saved.json().data.lowStockThreshold).toBe(1);

    const consumed = await app.inject({ method: "PATCH", url: `/api/stock/${stockId}/consume`, headers: bearer(maria) });
    expect(consumed.json().data.lowStockThreshold).toBe(1);
    expect(consumed.json().data.quantity).toBe(2);

    const cleared = await app.inject({
      method: "PATCH",
      url: `/api/stock/${stockId}`,
      headers: bearer(maria),
      payload: { lowStockThreshold: null }
    });
    expect(cleared.json().data.lowStockThreshold).toBeNull();
  });

  it("rejects a negative threshold", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: `/api/stock/${stockId}`,
      headers: bearer(maria),
      payload: { lowStockThreshold: -1 }
    });
    expect(response.statusCode).toBe(400);
  });
});
