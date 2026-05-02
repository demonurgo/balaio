CREATE TYPE "public"."stock_status" AS ENUM('in_stock', 'consumed');--> statement-breakpoint
CREATE TABLE "stock_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"source_fair_id" uuid,
	"source_fair_item_id" uuid,
	"name" varchar(160) NOT NULL,
	"quantity" numeric(10, 2) DEFAULT '1' NOT NULL,
	"unit" varchar(24) DEFAULT 'un' NOT NULL,
	"unit_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"category" varchar(80),
	"notes" text,
	"image_url" text,
	"status" "stock_status" DEFAULT 'in_stock' NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "stock_items" ADD CONSTRAINT "stock_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_items" ADD CONSTRAINT "stock_items_source_fair_id_fairs_id_fk" FOREIGN KEY ("source_fair_id") REFERENCES "public"."fairs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_items" ADD CONSTRAINT "stock_items_source_fair_item_id_fair_items_id_fk" FOREIGN KEY ("source_fair_item_id") REFERENCES "public"."fair_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "stock_items_user_source_item_idx" ON "stock_items" USING btree ("user_id","source_fair_item_id");
--> statement-breakpoint
INSERT INTO "stock_items" (
	"user_id",
	"source_fair_id",
	"source_fair_item_id",
	"name",
	"quantity",
	"unit",
	"unit_price",
	"total_price",
	"category",
	"notes",
	"image_url",
	"status",
	"created_at",
	"updated_at"
)
SELECT
	"fairs"."owner_id",
	"fair_items"."fair_id",
	"fair_items"."id",
	"fair_items"."name",
	"fair_items"."quantity",
	"fair_items"."unit",
	"fair_items"."unit_price",
	"fair_items"."total_price",
	"fair_items"."category",
	"fair_items"."notes",
	"fair_items"."image_url",
	'in_stock',
	"fair_items"."created_at",
	now()
FROM "fair_items"
INNER JOIN "fairs" ON "fairs"."id" = "fair_items"."fair_id"
WHERE "fair_items"."purchased" = true
ON CONFLICT ("user_id", "source_fair_item_id") DO NOTHING;
