CREATE TABLE "point_redemptions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"point_reward_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"points_spent" integer NOT NULL,
	"reward_id" varchar,
	"code" varchar,
	"status" varchar DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "point_rewards" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar NOT NULL,
	"description" text,
	"emoji" varchar,
	"points_cost" integer NOT NULL,
	"type" varchar DEFAULT 'business_perk' NOT NULL,
	"business_id" varchar,
	"created_by_user_id" varchar,
	"created_by_role" varchar DEFAULT 'business' NOT NULL,
	"quantity" integer,
	"redeemed_count" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"ends_at" timestamp,
	"draw_at" timestamp,
	"winner_redemption_id" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "point_redemptions" ADD CONSTRAINT "point_redemptions_point_reward_id_point_rewards_id_fk" FOREIGN KEY ("point_reward_id") REFERENCES "public"."point_rewards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "point_redemptions" ADD CONSTRAINT "point_redemptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "point_redemptions" ADD CONSTRAINT "point_redemptions_reward_id_rewards_id_fk" FOREIGN KEY ("reward_id") REFERENCES "public"."rewards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "point_rewards" ADD CONSTRAINT "point_rewards_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "point_rewards" ADD CONSTRAINT "point_rewards_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;