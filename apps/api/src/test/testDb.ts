import { PGlite } from "@electric-sql/pglite";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { fileURLToPath } from "node:url";
import * as schema from "../db/schema.js";

const migrationsFolder = fileURLToPath(new URL("../../drizzle", import.meta.url));

/**
 * In-memory Postgres (PGlite) with the real Drizzle migrations, used in tests
 * through `vi.mock("../db/client.js", () => createTestDb())`.
 */
export async function createTestDb() {
  const client = new PGlite();
  const db = drizzle(client, { schema });

  await migrate(db, { migrationsFolder });

  return {
    db,
    async closeDb() {
      await client.close();
    },
    async resetDb() {
      await db.execute(sql`TRUNCATE TABLE users CASCADE`);
    }
  };
}
