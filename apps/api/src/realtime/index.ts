import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { env } from "../env.js";

export type RealtimeServer = Server<ClientToServerEvents, ServerToClientEvents>;

type JoinFairPayload = {
  fairId: string;
};

type ClientToServerEvents = {
  "fair:join": (payload: JoinFairPayload) => void;
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

export function fairRoom(fairId: string) {
  return `fair:${fairId}`;
}

export function createRealtime(httpServer: HttpServer): RealtimeServer {
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN,
      credentials: true
    }
  });

  io.on("connection", (socket) => {
    socket.on("fair:join", ({ fairId }) => {
      socket.join(fairRoom(fairId));
    });

    socket.on("fair:leave", ({ fairId }) => {
      socket.leave(fairRoom(fairId));
    });
  });

  return io;
}
