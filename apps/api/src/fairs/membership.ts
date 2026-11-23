import { and, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { fairMembers } from "../db/schema.js";

export async function getMembership(fairId: string, userId: string) {
  const rows = await db
    .select({ role: fairMembers.role })
    .from(fairMembers)
    .where(and(eq(fairMembers.fairId, fairId), eq(fairMembers.userId, userId)))
    .limit(1);

  return rows[0] ?? null;
}
