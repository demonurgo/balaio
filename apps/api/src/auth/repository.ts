import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";

export type AuthUserRecord = {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  email: string;
  passwordHash: string;
};

export type CreateUserInput = {
  firstName: string;
  lastName: string;
  birthDate: string;
  email: string;
  passwordHash: string;
};

export type UpdateUserInput = {
  firstName: string;
  lastName: string;
  birthDate: string;
  email: string;
};

export type AuthRepository = {
  findUserByEmail: (email: string) => Promise<AuthUserRecord | null>;
  findUserById: (id: string) => Promise<AuthUserRecord | null>;
  createUser: (input: CreateUserInput) => Promise<AuthUserRecord>;
  updateUser: (id: string, input: UpdateUserInput) => Promise<AuthUserRecord | null>;
};

const userColumns = {
  id: users.id,
  name: users.name,
  firstName: users.firstName,
  lastName: users.lastName,
  birthDate: users.birthDate,
  email: users.email,
  passwordHash: users.passwordHash
};

export function createDbAuthRepository(): AuthRepository {
  return {
    async findUserByEmail(email) {
      const rows = await db.select(userColumns).from(users).where(eq(users.email, email)).limit(1);
      return rows[0] ?? null;
    },
    async findUserById(id) {
      const rows = await db.select(userColumns).from(users).where(eq(users.id, id)).limit(1);
      return rows[0] ?? null;
    },
    async createUser(input) {
      const name = `${input.firstName} ${input.lastName}`.trim();
      const rows = await db
        .insert(users)
        .values({
          name,
          firstName: input.firstName,
          lastName: input.lastName,
          birthDate: input.birthDate,
          email: input.email,
          passwordHash: input.passwordHash
        })
        .returning(userColumns);

      if (!rows[0]) {
        throw new Error("User creation failed");
      }

      return rows[0];
    },
    async updateUser(id, input) {
      const name = `${input.firstName} ${input.lastName}`.trim();
      const rows = await db
        .update(users)
        .set({
          name,
          firstName: input.firstName,
          lastName: input.lastName,
          birthDate: input.birthDate,
          email: input.email,
          updatedAt: new Date()
        })
        .where(eq(users.id, id))
        .returning(userColumns);

      return rows[0] ?? null;
    }
  };
}
