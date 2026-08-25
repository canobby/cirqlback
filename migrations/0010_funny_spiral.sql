ALTER TABLE "businesses" ADD COLUMN "stripe_connect_account_id" varchar;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "connect_payouts_enabled" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "connect_details_submitted" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "connect_onboarded_at" timestamp;--> statement-breakpoint
ALTER TABLE "reward_settlements" ADD COLUMN "stripe_transfer_id" varchar;