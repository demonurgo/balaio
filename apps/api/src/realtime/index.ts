import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { env } from "../env.js";

export type RealtimeServer = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

type JoinFairPayload = {
  fairId: string;
};

type JoinFairAck = (result: { ok: boolean; message?: string }) => void;

type ClientToServerEvents = {
  "fair:join": (payload: JoinFairPayload, ack?: JoinFairAck) => void;
  "fair:leave": (payload: JoinFairPayload) => void;
};

type ServerToClientEvents = {
  "fair:updated": (payload: RealtimeFairEvent) => void;
  "fair:deleted": (payload: RealtimeFairEvent) => void;
  "item:created": (payload: RealtimeItemEvent) => void;
  "item:updated": (payload: RealtimeItemEvent) => void;
  "item:deleted": (payload: RealtimeItemEvent) => void;
  "budget:updated": (payload: RealtimeBudgetEvent) => void;
  "stock:updated": (payload: RealtimeStockEvent) => void;
};

type SocketData = {
  userId: string;
};

export type RealtimeFairEvent = {
  fairId: string;
  changedBy?: string;
};

export type RealtimeItemEvent = {
  fairId: string;
  itemId: string;
  changedBy?: string;
};

export type RealtimeBudgetEvent = {
  fairId: string;
  changedBy?: string;
};

export type RealtimeStockEvent = {
  changedBy?: string;
};

export type RealtimeAuth = {
  /** Resolves the user from the handshake (auth token, Bearer header or cookie). */
  authenticate: (handshake: { auth: Record<string, unknown>; headers: Record<string, string | string[] | undefined> }) => Promise<string | null>;
  isMember: (fairId: string, userId: string) => Promise<boolean>;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function fairRoom(fairId: string) {
  return `fair:${fairId}`;
}

/** Private room of each user: stock events and "you left this fair" notices. */
export function userRoom(userId: string) {
  return `user:${userId}`;
}

export function createRealtime(httpServer: HttpServer, auth: RealtimeAuth): RealtimeServer {
  const io: RealtimeServer = new Server(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN,
      credentials: true
    }
  });

  io.use((socket, next) => {
    auth
      .authenticate({ auth: socket.handshake.auth ?? {}, headers: socket.handshake.headers })
      .then((userId) => {
        if (!userId) {
          next(new Error("Unauthenticated"));
          return;
        }

        socket.data.userId = userId;
        next();
      })
      .catch(() => next(new Error("Unauthenticated")));
  });

  io.on("connection", (socket) => {
    void socket.join(userRoom(socket.data.userId));

    socket.on("fair:join", async (payload, ack) => {
      const fairId = typeof payload?.fairId === "string" ? payload.fairId : "";
      const allowed = uuidPattern.test(fairId) && (await auth.isMember(fairId, socket.data.userId).catch(() => false));

      if (allowed) {
        await socket.join(fairRoom(fairId));
      }

      if (typeof ack === "function") {
        ack(allowed ? { ok: true } : { ok: false, message: "Você não participa dessa feira." });
      }
    });

    socket.on("fair:leave", (payload) => {
      if (typeof payload?.fairId === "string") {
        void socket.leave(fairRoom(payload.fairId));
      }
    });
  });

  return io;
}
