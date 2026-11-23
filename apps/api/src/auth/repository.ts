import { and, eq, ne } from "drizzle-orm";
import { db } from "../db/client.js";
import { fairMembers, fairs, users } from "../db/schema.js";

export type AuthUserRecord = {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  email: string;
  imageUrl: string | null;
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
  imageUrl?: string | null | undefined;
};

export type DeletedUserResult = {
  /** Fairs owned by the user: deleted for every member (cascade). */
  ownedFairIds: string[];
  /** Fairs shared with the user: they only lose this member. */
  memberFairIds: string[];
};

export type AuthRepository = {
  findUserByEmail: (email: string) => Promise<AuthUserRecord | null>;
  findUserById: (id: string) => Promise<AuthUserRecord | null>;
  createUser: (input: CreateUserInput) => Promise<AuthUserRecord>;
  updateUser: (id: string, input: UpdateUserInput) => Promise<AuthUserRecord | null>;
  deleteUser: (id: string) => Promise<DeletedUserResult>;
};

const userColumns = {
  id: users.id,
  name: users.name,
  firstName: users.firstName,
  lastName: users.lastName,
  birthDate: users.birthDate,
  email: users.email,
  imageUrl: users.imageUrl,
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
          ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
          updatedAt: new Date()
        })
        .where(eq(users.id, id))
        .returning(userColumns);

      return rows[0] ?? null;
    },
    async deleteUser(id) {
      return db.transaction(async (tx) => {
        const owned = await tx.select({ id: fairs.id }).from(fairs).where(eq(fairs.ownerId, id));
        const shared = await tx
          .select({ id: fairMembers.fairId })
          .from(fairMembers)
          .innerJoin(fairs, eq(fairMembers.fairId, fairs.id))
          .where(and(eq(fairMembers.userId, id), ne(fairs.ownerId, id)));

        // Foreign keys cascade: owned fairs (with items, members and invites),
        // memberships, stock and templates go away with the user.
        await tx.delete(users).where(eq(users.id, id));

        return {
          ownedFairIds: owned.map((fair) => fair.id),
          memberFairIds: shared.map((fair) => fair.id)
        };
      });
    }
  };
}
