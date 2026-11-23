CREATE TABLE "fair_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(32) NOT NULL,
	"fair_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"role" "member_role" DEFAULT 'editor' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fair_items" ALTER COLUMN "pricing_mode" SET DEFAULT 'total';--> statement-breakpoint
ALTER TABLE "fair_invites" ADD CONSTRAINT "fair_invites_fair_id_fairs_id_fk" FOREIGN KEY ("fair_id") REFERENCES "public"."fairs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fair_invites" ADD CONSTRAINT "fair_invites_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "fair_invites_code_idx" ON "fair_invites" USING btree ("code");