CREATE TABLE "badge_awards" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"badge_definition_id" varchar NOT NULL,
	"recipient_user_id" varchar,
	"recipient_business_id" varchar,
	"note" text,
	"awarder_role" varchar NOT NULL,
	"awarder_user_id" varchar,
	"awarder_business_id" varchar,
	"awarded_at" timestamp DEFAULT now(),
	"revoked_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "badge_definitions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"emoji" varchar,
	"image_data_uri" text,
	"color" varchar DEFAULT '#7c3aed',
	"audience" varchar DEFAULT 'any' NOT NULL,
	"awardable_by" varchar DEFAULT 'admin' NOT NULL,
	"tier" varchar,
	"is_custom" boolean DEFAULT false,
	"created_by_user_id" varchar,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "badge_definitions_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "badge_awards" ADD CONSTRAINT "badge_awards_badge_definition_id_badge_definitions_id_fk" FOREIGN KEY ("badge_definition_id") REFERENCES "public"."badge_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "badge_awards" ADD CONSTRAINT "badge_awards_recipient_user_id_users_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "badge_awards" ADD CONSTRAINT "badge_awards_recipient_business_id_businesses_id_fk" FOREIGN KEY ("recipient_business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "badge_awards" ADD CONSTRAINT "badge_awards_awarder_user_id_users_id_fk" FOREIGN KEY ("awarder_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "badge_awards" ADD CONSTRAINT "badge_awards_awarder_business_id_businesses_id_fk" FOREIGN KEY ("awarder_business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "badge_definitions" ADD CONSTRAINT "badge_definitions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;