CREATE TYPE "public"."channel" AS ENUM('line_menu', 'tiktok', 'facebook', 'ig', 'youtube', 'other');--> statement-breakpoint
CREATE TYPE "public"."coupon_status" AS ENUM('unused', 'used', 'expired');--> statement-breakpoint
CREATE TYPE "public"."discount_type" AS ENUM('final_price', 'percentage_off', 'cash_voucher');--> statement-breakpoint
CREATE TYPE "public"."language" AS ENUM('zh-cn', 'en-us', 'th-th');--> statement-breakpoint
CREATE TYPE "public"."preferred_language" AS ENUM('th', 'en', 'zh');--> statement-breakpoint
CREATE TABLE "admins" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "admins_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "campaign_stores" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaign_id" integer NOT NULL,
	"store_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"title_source_lang" "language" DEFAULT 'th-th' NOT NULL,
	"title_source" text NOT NULL,
	"title_zh" text,
	"title_en" text,
	"title_th" text,
	"description_source_lang" "language" DEFAULT 'th-th' NOT NULL,
	"description_source" text NOT NULL,
	"description_zh" text,
	"description_en" text,
	"description_th" text,
	"banner_image_url" text,
	"media_urls" text[],
	"coupon_value" numeric(10, 2) NOT NULL,
	"discount_type" "discount_type" NOT NULL,
	"original_price" numeric(10, 2),
	"start_at" timestamp NOT NULL,
	"end_at" timestamp NOT NULL,
	"max_per_user" integer DEFAULT 1 NOT NULL,
	"max_total" integer,
	"current_claimed" integer DEFAULT 0 NOT NULL,
	"channel" "channel",
	"staff_instructions_source_lang" "language" DEFAULT 'th-th',
	"staff_instructions_source" text,
	"staff_instructions_zh" text,
	"staff_instructions_en" text,
	"staff_instructions_th" text,
	"staff_training_source_lang" "language" DEFAULT 'th-th',
	"staff_training_source" text,
	"staff_training_zh" text,
	"staff_training_en" text,
	"staff_training_th" text,
	"staff_training_media_urls" text[],
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coupons" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"campaign_id" integer NOT NULL,
	"code" text NOT NULL,
	"status" "coupon_status" DEFAULT 'unused' NOT NULL,
	"issued_at" timestamp DEFAULT now() NOT NULL,
	"used_at" timestamp,
	"expired_at" timestamp NOT NULL,
	"channel" "channel" DEFAULT 'other' NOT NULL,
	"redeemed_store_id" integer,
	"notes" text,
	CONSTRAINT "coupons_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "media_files" (
	"id" serial PRIMARY KEY NOT NULL,
	"file_name" text NOT NULL,
	"file_url" text NOT NULL,
	"file_type" text NOT NULL,
	"file_size" integer NOT NULL,
	"uploaded_by" integer,
	"is_public" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_presets" (
	"id" serial PRIMARY KEY NOT NULL,
	"store_id" integer NOT NULL,
	"name" text NOT NULL,
	"staff_id" text NOT NULL,
	"phone" text NOT NULL,
	"auth_token" text NOT NULL,
	"is_bound" boolean DEFAULT false NOT NULL,
	"bound_user_id" integer,
	"bound_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "staff_presets_auth_token_unique" UNIQUE("auth_token")
);
--> statement-breakpoint
CREATE TABLE "stores" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"brand" text,
	"city" text NOT NULL,
	"address" text NOT NULL,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"phone" text,
	"rating" numeric(2, 1),
	"image_url" text,
	"floor_info" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"line_user_id" text NOT NULL,
	"display_name" text,
	"avatar_url" text,
	"phone" text,
	"language" "language" DEFAULT 'th-th' NOT NULL,
	"preferred_language" "preferred_language",
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_line_user_id_unique" UNIQUE("line_user_id")
);
--> statement-breakpoint
ALTER TABLE "campaign_stores" ADD CONSTRAINT "campaign_stores_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_stores" ADD CONSTRAINT "campaign_stores_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_redeemed_store_id_stores_id_fk" FOREIGN KEY ("redeemed_store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_files" ADD CONSTRAINT "media_files_uploaded_by_admins_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_presets" ADD CONSTRAINT "staff_presets_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_presets" ADD CONSTRAINT "staff_presets_bound_user_id_users_id_fk" FOREIGN KEY ("bound_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;