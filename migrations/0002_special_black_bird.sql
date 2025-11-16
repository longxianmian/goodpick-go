CREATE TYPE "public"."broadcast_status" AS ENUM('pending', 'sending', 'done', 'failed', 'cancelled');--> statement-breakpoint
CREATE TABLE "campaign_broadcasts" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaign_id" integer NOT NULL,
	"oa_id" text NOT NULL,
	"target_type" text DEFAULT 'ALL' NOT NULL,
	"send_time" timestamp NOT NULL,
	"status" "broadcast_status" DEFAULT 'pending' NOT NULL,
	"total_targets" integer DEFAULT 0 NOT NULL,
	"sent_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "campaign_broadcasts" ADD CONSTRAINT "campaign_broadcasts_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_broadcasts" ADD CONSTRAINT "campaign_broadcasts_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;