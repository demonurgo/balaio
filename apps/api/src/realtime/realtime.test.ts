import type { AddressInfo } from "node:net";
import type { FastifyInstance } from "fastify";
import { io as connect, type Socket } from "socket.io-client";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createApp } from "../app.js";
import { closeDb } from "../db/client.js";
import { bearer, registerUser, type TestUser } from "../test/helpers.js";

vi.mock("../db/client.js", async () => (await import("../test/testDb.js")).createTestDb());

describe("authenticated realtime", () => {
  let app: FastifyInstance;
  let url: string;
  const sockets: Socket[] = [];

  beforeAll(async () => {
    app = (await createApp()).app;
    await app.listen({ port: 0, host: "127.0.0.1" });
    url = `http://127.0.0.1:${(app.server.address() as AddressInfo).port}`;
  });

  afterEach(() => {
    sockets.splice(0).forEach((socket) => socket.disconnect());
  });

  afterAll(async () => {
    await app.close();
    await closeDb();
  });

  function open(options: Parameters<typeof connect>[1]) {
    const socket = connect(url, { transports: ["websocket"], reconnection: false, ...options });
    sockets.push(socket);
    return socket;
  }

  function connected(socket: Socket) {
    return new Promise<void>((resolve, reject) => {
      socket.once("connect", () => resolve());
      socket.once("connect_error", reject);
    });
  }

  function join(socket: Socket, fairId: string) {
    return new Promise<{ ok: boolean }>((resolve) => socket.emit("fair:join", { fairId }, resolve));
  }

  async function createFair(user: TestUser) {
    const response = await app.inject({
      method: "POST",
      url: "/api/fairs",
      headers: bearer(user),
      payload: { month: 5, year: 2026 }
    });
    return response.json().data.id as string;
  }

  it("refuses connections without a valid token", async () => {
    await expect(connected(open({}))).rejects.toThrow("Unauthenticated");
    await expect(connected(open({ auth: { token: "invalido" } }))).rejects.toThrow("Unauthenticated");
  });

  it("accepts the token, the Bearer header or the PWA cookie", async () => {
    const maria = await registerUser(app, "Maria");

    await connected(open({ auth: { token: maria.token } }));
    await connected(open({ extraHeaders: { authorization: `Bearer ${maria.token}` } }));
    await connected(open({ extraHeaders: { cookie: maria.cookie } }));
  });

  it("only joins members to the fair room and keeps stock events private", async () => {
    const maria = await registerUser(app, "Maria");
    const joao = await registerUser(app, "Joao");
    const fairId = await createFair(maria);
    const mariaSocket = open({ auth: { token: maria.token } });
    const joaoSocket = open({ auth: { token: joao.token } });

    await Promise.all([connected(mariaSocket), connected(joaoSocket)]);

    expect(await join(joaoSocket, fairId)).toMatchObject({ ok: false });
    expect(await join(mariaSocket, fairId)).toEqual({ ok: true });

    const joaoEvents: string[] = [];
    joaoSocket.onAny((event) => joaoEvents.push(event));

    const itemCreated = new Promise((resolve) => mariaSocket.once("item:created", resolve));
    const stockUpdated = new Promise((resolve) => mariaSocket.once("stock:updated", resolve));

    await app.inject({
      method: "POST",
      url: `/api/fairs/${fairId}/items`,
      headers: bearer(maria),
      payload: { name: "Alface", unitPrice: 3, purchased: true }
    });

    await expect(itemCreated).resolves.toMatchObject({ fairId });
    await expect(stockUpdated).resolves.toMatchObject({ changedBy: maria.id });
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(joaoEvents).toEqual([]);
  });
});
