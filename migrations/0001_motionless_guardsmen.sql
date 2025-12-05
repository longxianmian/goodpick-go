CREATE TABLE "oa_user_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"oa_id" text NOT NULL,
	"line_user_id" text NOT NULL,
	"user_id" integer,
	"initial_language" "preferred_language" NOT NULL,
	"welcome_sent" boolean DEFAULT false NOT NULL,
	"welcome_sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "oa_user_links_oa_id_line_user_id_unique" UNIQUE("oa_id","line_user_id")
);
--> statement-breakpoint
ALTER TABLE "oa_user_links" ADD CONSTRAINT "oa_user_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;