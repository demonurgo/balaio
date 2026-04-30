import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { fairRoom, type RealtimeServer } from "../realtime/index.js";

const fairParamsSchema = z.object({
  fairId: z.string().uuid()
});

export async function registerFairRoutes(app: FastifyInstance, io: RealtimeServer) {
  app.get("/api/fairs", async () => ({
    data: []
  }));

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
