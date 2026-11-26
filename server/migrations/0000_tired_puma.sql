CREATE TABLE "advent" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"year" smallint NOT NULL,
	"invite_token_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "advent_invite_token_hash_key" UNIQUE("invite_token_hash"),
	CONSTRAINT "advent_name_check" CHECK (btrim("advent"."name") <> ''),
	CONSTRAINT "advent_year_check" CHECK ("advent"."year" BETWEEN 1 AND 9999)
);
--> statement-breakpoint
CREATE TABLE "advent_day" (
	"advent_id" uuid NOT NULL,
	"advent_day" smallint NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	CONSTRAINT "advent_day_pkey" PRIMARY KEY("advent_id","advent_day"),
	CONSTRAINT "advent_day_advent_day_check" CHECK ("advent_day"."advent_day" BETWEEN 1 AND 25)
);
--> statement-breakpoint
CREATE TABLE "advent_day_opening" (
	"advent_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"advent_day" smallint NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "advent_day_opening_pkey" PRIMARY KEY("advent_id","user_id","advent_day"),
	CONSTRAINT "advent_day_opening_advent_day_check" CHECK ("advent_day_opening"."advent_day" BETWEEN 1 AND 25)
);
--> statement-breakpoint
CREATE TABLE "advent_member" (
	"advent_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "advent_member_pkey" PRIMARY KEY("advent_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "app_user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_user_provider_id_key" UNIQUE("provider_id")
);
--> statement-breakpoint
ALTER TABLE "advent_day" ADD CONSTRAINT "advent_day_advent_id_fkey" FOREIGN KEY ("advent_id") REFERENCES "public"."advent"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advent_day_opening" ADD CONSTRAINT "advent_day_opening_advent_id_user_id_fkey" FOREIGN KEY ("advent_id","user_id") REFERENCES "public"."advent_member"("advent_id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advent_day_opening" ADD CONSTRAINT "advent_day_opening_advent_id_advent_day_fkey" FOREIGN KEY ("advent_id","advent_day") REFERENCES "public"."advent_day"("advent_id","advent_day") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advent_member" ADD CONSTRAINT "advent_member_advent_id_fkey" FOREIGN KEY ("advent_id") REFERENCES "public"."advent"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advent_member" ADD CONSTRAINT "advent_member_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "advent_day_opening_day_idx" ON "advent_day_opening" USING btree ("advent_id","advent_day");--> statement-breakpoint
CREATE INDEX "advent_member_user_id_idx" ON "advent_member" USING btree ("user_id");