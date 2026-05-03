import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from "drizzle-orm/pg-core";

export const memberRole = pgEnum("member_role", ["owner", "editor", "viewer"]);
export const stockStatus = pgEnum("stock_status", ["in_stock", "consumed"]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  firstName: varchar("first_name", { length: 80 }).notNull().default(""),
  lastName: varchar("last_name", { length: 80 }).notNull().default(""),
  birthDate: date("birth_date").notNull().default("1900-01-01"),
  email: varchar("email", { length: 255 }).notNull().unique(),
  imageUrl: text("image_url"),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const fairs = pgTable(
  "fairs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: uuid("owner_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    month: integer("month").notNull(),
    year: integer("year").notNull(),
    budget: numeric("budget", { precision: 12, scale: 2 }).notNull().default("0"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    ownerMonthIdx: uniqueIndex("fairs_owner_month_year_idx").on(table.ownerId, table.month, table.year)
  })
);

export const fairMembers = pgTable(
  "fair_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fairId: uuid("fair_id")
      .references(() => fairs.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    role: memberRole("role").notNull().default("editor"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    memberIdx: uniqueIndex("fair_members_fair_user_idx").on(table.fairId, table.userId)
  })
);

export const fairItems = pgTable("fair_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  fairId: uuid("fair_id")
    .references(() => fairs.id, { onDelete: "cascade" })
    .notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull().default("1"),
  unit: varchar("unit", { length: 24 }).notNull().default("un"),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull().default("0"),
  totalPrice: numeric("total_price", { precision: 12, scale: 2 }).notNull().default("0"),
  purchased: boolean("purchased").notNull().default(false),
  category: varchar("category", { length: 80 }),
  notes: text("notes"),
  imageUrl: text("image_url"),
  position: integer("position").notNull().default(0),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const productTemplates = pgTable("product_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  defaultQuantity: numeric("default_quantity", { precision: 10, scale: 2 }).notNull().default("1"),
  defaultUnit: varchar("default_unit", { length: 24 }).notNull().default("un"),
  defaultCategory: varchar("default_category", { length: 80 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const stockItems = pgTable(
  "stock_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    sourceFairId: uuid("source_fair_id").references(() => fairs.id, { onDelete: "set null" }),
    sourceFairItemId: uuid("source_fair_item_id").references(() => fairItems.id, { onDelete: "set null" }),
    name: varchar("name", { length: 160 }).notNull(),
    quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull().default("1"),
    unit: varchar("unit", { length: 24 }).notNull().default("un"),
    unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull().default("0"),
    totalPrice: numeric("total_price", { precision: 12, scale: 2 }).notNull().default("0"),
    category: varchar("category", { length: 80 }),
    notes: text("notes"),
    imageUrl: text("image_url"),
    status: stockStatus("status").notNull().default("in_stock"),
    consumedBy: uuid("consumed_by").references(() => users.id, { onDelete: "set null" }),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    sourceItemIdx: uniqueIndex("stock_items_user_source_item_idx").on(table.userId, table.sourceFairItemId)
  })
);

export const usersRelations = relations(users, ({ many }) => ({
  ownedFairs: many(fairs),
  fairMemberships: many(fairMembers),
  productTemplates: many(productTemplates),
  stockItems: many(stockItems)
}));

export const fairsRelations = relations(fairs, ({ one, many }) => ({
  owner: one(users, {
    fields: [fairs.ownerId],
    references: [users.id]
  }),
  members: many(fairMembers),
  items: many(fairItems)
}));

export const fairItemsRelations = relations(fairItems, ({ one }) => ({
  fair: one(fairs, {
    fields: [fairItems.fairId],
    references: [fairs.id]
  }),
  updatedByUser: one(users, {
    fields: [fairItems.updatedBy],
    references: [users.id]
  })
}));

export const stockItemsRelations = relations(stockItems, ({ one }) => ({
  user: one(users, {
    fields: [stockItems.userId],
    references: [users.id]
  }),
  sourceFair: one(fairs, {
    fields: [stockItems.sourceFairId],
    references: [fairs.id]
  }),
  sourceFairItem: one(fairItems, {
    fields: [stockItems.sourceFairItemId],
    references: [fairItems.id]
  }),
  consumedByUser: one(users, {
    fields: [stockItems.consumedBy],
    references: [users.id]
  })
}));
