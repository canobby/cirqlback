CREATE TABLE "reward_contributions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_campaign_id" varchar NOT NULL,
	"reward_id" varchar NOT NULL,
	"host_business_id" varchar NOT NULL,
	"business_id" varchar NOT NULL,
	"customer_email" varchar,
	"weight_taps" integer DEFAULT 0,
	"total_reward_cents" integer DEFAULT 0 NOT NULL,
	"share_cents" integer DEFAULT 0 NOT NULL,
	"basis" varchar DEFAULT 'weighted' NOT NULL,
	"period_month" varchar NOT NULL,
	"settlement_id" varchar,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "reward_contributions_reward_business_unique" UNIQUE("reward_id","business_id")
);
--> statement-breakpoint
CREATE TABLE "reward_settlements" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"host_business_id" varchar NOT NULL,
	"period_month" varchar NOT NULL,
	"total_cents" integer DEFAULT 0 NOT NULL,
	"contribution_count" integer DEFAULT 0 NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"method" varchar DEFAULT 'manual',
	"reference" varchar,
	"notes" text,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"paid_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "reward_contributions" ADD CONSTRAINT "reward_contributions_group_campaign_id_group_campaigns_id_fk" FOREIGN KEY ("group_campaign_id") REFERENCES "public"."group_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_contributions" ADD CONSTRAINT "reward_contributions_reward_id_rewards_id_fk" FOREIGN KEY ("reward_id") REFERENCES "public"."rewards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_contributions" ADD CONSTRAINT "reward_contributions_host_business_id_businesses_id_fk" FOREIGN KEY ("host_business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_contributions" ADD CONSTRAINT "reward_contributions_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_contributions" ADD CONSTRAINT "reward_contributions_settlement_id_reward_settlements_id_fk" FOREIGN KEY ("settlement_id") REFERENCES "public"."reward_settlements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_settlements" ADD CONSTRAINT "reward_settlements_host_business_id_businesses_id_fk" FOREIGN KEY ("host_business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_settlements" ADD CONSTRAINT "reward_settlements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;