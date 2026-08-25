CREATE TABLE "admin_communications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sender_id" varchar,
	"recipient_id" varchar,
	"recipient_role" varchar,
	"recipient_level" varchar,
	"type" varchar NOT NULL,
	"priority" varchar DEFAULT 'normal',
	"subject" varchar NOT NULL,
	"content" text NOT NULL,
	"metadata" jsonb DEFAULT '{}',
	"is_read" boolean DEFAULT false,
	"read_at" timestamp,
	"requires_acknowledgment" boolean DEFAULT false,
	"acknowledged_at" timestamp,
	"action_required" varchar,
	"action_completed_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "admin_knowledge_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" varchar NOT NULL,
	"subcategory" varchar,
	"title" varchar NOT NULL,
	"description" text,
	"importance" varchar DEFAULT 'medium',
	"required_for" text[] DEFAULT '{}',
	"verification_method" varchar,
	"resource_links" jsonb DEFAULT '{}',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "admin_training_modules" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar NOT NULL,
	"description" text,
	"module_type" varchar NOT NULL,
	"category" varchar NOT NULL,
	"required_level" varchar DEFAULT 'basic',
	"content" jsonb NOT NULL,
	"passing_score" integer DEFAULT 80,
	"time_estimate" integer,
	"prerequisites" text[] DEFAULT '{}',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "admin_training_progress" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_user_id" varchar NOT NULL,
	"module_id" varchar NOT NULL,
	"status" varchar DEFAULT 'not_started',
	"score" integer,
	"time_spent" integer,
	"completed_at" timestamp,
	"attempts" integer DEFAULT 0,
	"last_attempt_at" timestamp,
	"answers" jsonb,
	"feedback" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"admin_level" varchar NOT NULL,
	"permissions" jsonb NOT NULL,
	"invited_by" varchar,
	"invite_token" varchar,
	"invite_expires_at" timestamp,
	"invite_accepted_at" timestamp,
	"invitation_email" varchar,
	"training_status" varchar DEFAULT 'pending',
	"training_completed_at" timestamp,
	"certification_level" varchar DEFAULT 'basic',
	"knowledge_checklist_progress" jsonb DEFAULT '{}',
	"practical_test_score" integer,
	"communication_preferences" jsonb DEFAULT '{
    "email_notifications": true,
    "system_alerts": true,
    "training_updates": true,
    "platform_announcements": true
  }',
	"specializations" text[] DEFAULT '{}',
	"emergency_contact" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now(),
	"last_login_at" timestamp,
	"last_active_at" timestamp,
	"is_active" boolean DEFAULT true,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "admin_users_invite_token_unique" UNIQUE("invite_token")
);
--> statement-breakpoint
CREATE TABLE "api_usage" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"endpoint" varchar NOT NULL,
	"method" varchar NOT NULL,
	"requests_count" integer DEFAULT 1,
	"response_time" integer,
	"status_code" integer,
	"error_message" text,
	"created_at" timestamp DEFAULT now(),
	"month" varchar NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" varchar NOT NULL,
	"action" varchar NOT NULL,
	"target_type" varchar NOT NULL,
	"target_id" varchar NOT NULL,
	"changes" jsonb,
	"reason" text,
	"ip_address" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "business_addons" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" varchar NOT NULL,
	"addon_key" varchar NOT NULL,
	"status" varchar DEFAULT 'active',
	"source" varchar DEFAULT 'stripe',
	"stripe_payment_intent_id" varchar,
	"activated_at" timestamp DEFAULT now(),
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "business_addons_unique" UNIQUE("business_id","addon_key")
);
--> statement-breakpoint
CREATE TABLE "business_goals" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" varchar NOT NULL,
	"goal_type" varchar NOT NULL,
	"target_value" numeric(10, 2) NOT NULL,
	"current_value" numeric(10, 2) DEFAULT '0.00',
	"timeframe" varchar NOT NULL,
	"start_date" varchar NOT NULL,
	"end_date" varchar NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "business_pairing_scores" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_a_id" varchar NOT NULL,
	"business_b_id" varchar NOT NULL,
	"compatibility_score" real NOT NULL,
	"customer_overlap_score" real NOT NULL,
	"geographic_score" real NOT NULL,
	"complementary_score" real NOT NULL,
	"traffic_pattern_score" real NOT NULL,
	"cost_efficiency_score" real NOT NULL,
	"historical_success_score" real,
	"seasonal_compatibility" jsonb,
	"shared_customer_count" integer DEFAULT 0,
	"average_distance_between" real,
	"last_calculated" timestamp DEFAULT now(),
	"is_recommended" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "business_partnerships" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_a_id" varchar NOT NULL,
	"business_b_id" varchar NOT NULL,
	"partnership_type" varchar NOT NULL,
	"status" varchar DEFAULT 'pending',
	"commission_rate" real,
	"shared_budget" numeric(10, 2),
	"total_referrals" integer DEFAULT 0,
	"total_revenue" numeric(10, 2) DEFAULT 0,
	"terms" text,
	"start_date" timestamp,
	"end_date" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "business_recommendations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"for_business_id" varchar NOT NULL,
	"recommended_business_id" varchar NOT NULL,
	"recommendation_type" varchar NOT NULL,
	"confidence_score" real NOT NULL,
	"expected_benefit" varchar NOT NULL,
	"estimated_traffic_increase" real,
	"estimated_cost_savings" numeric(10, 2),
	"estimated_revenue_boost" numeric(10, 2),
	"recommendation_reason" text,
	"campaign_suggestions" jsonb,
	"optimal_campaign_timing" jsonb,
	"suggested_contribution_split" jsonb,
	"target_customer_segment" varchar,
	"is_viewed" boolean DEFAULT false,
	"is_accepted" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "business_reminders" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" varchar NOT NULL,
	"message" text NOT NULL,
	"created_by_user_id" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "business_tap_branding" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" varchar NOT NULL,
	"brand_color" varchar,
	"accent_color" varchar,
	"slogan" varchar,
	"logo_url" varchar,
	"links" jsonb DEFAULT '[]',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "business_tap_branding_business_id_unique" UNIQUE("business_id")
);
--> statement-breakpoint
CREATE TABLE "businesses" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"address" varchar,
	"latitude" real,
	"longitude" real,
	"phone" varchar,
	"email" varchar,
	"website" varchar,
	"logo" varchar,
	"owner_id" varchar,
	"territory_id" varchar,
	"verification_status" varchar DEFAULT 'unverified',
	"is_featured" boolean DEFAULT false,
	"is_nonprofit" boolean DEFAULT false,
	"ein" varchar,
	"nonprofit_mission" text,
	"is_active" boolean DEFAULT true,
	"total_taps" integer DEFAULT 0,
	"total_rewards_given" integer DEFAULT 0,
	"business_descriptors" text[] DEFAULT '{}',
	"cultural_background" varchar,
	"community_focus" text[] DEFAULT '{}',
	"accessibility_features" text[] DEFAULT '{}',
	"sustainability_practices" text[] DEFAULT '{}',
	"business_maturity" varchar,
	"establishment_type" text[] DEFAULT '{}',
	"specialty_features" text[] DEFAULT '{}',
	"price_range" varchar,
	"target_demographics" text[] DEFAULT '{}',
	"peak_hours" text[] DEFAULT '{}',
	"seasonal_patterns" text[] DEFAULT '{}',
	"customer_capacity" integer,
	"average_visit_duration" varchar,
	"primary_products" text[] DEFAULT '{}',
	"unique_selling_points" text[] DEFAULT '{}',
	"competitor_advantages" text[] DEFAULT '{}',
	"marketing_goals" text[] DEFAULT '{}',
	"customer_retention_rate" varchar,
	"average_spend_per_customer" varchar,
	"social_media_presence" text[] DEFAULT '{}',
	"event_hosting_capability" boolean DEFAULT false,
	"loyalty_program_interest" varchar,
	"marketing_budget" varchar,
	"enable_sales_tracking" boolean DEFAULT false,
	"sales_data_source" varchar DEFAULT 'manual',
	"website_enabled" boolean DEFAULT false,
	"custom_domain" varchar,
	"website_slug" varchar,
	"website_theme" varchar DEFAULT 'modern',
	"website_content" jsonb,
	"website_menu" jsonb,
	"website_services" jsonb,
	"website_hours" jsonb,
	"website_social_links" jsonb,
	"website_gallery" text[] DEFAULT '{}',
	"website_published" boolean DEFAULT false,
	"website_views" integer DEFAULT 0,
	"website_last_updated" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "businesses_website_slug_unique" UNIQUE("website_slug")
);
--> statement-breakpoint
CREATE TABLE "campaign_participations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"business_id" varchar,
	"progress" jsonb NOT NULL,
	"rewards_earned" jsonb DEFAULT '[]'::jsonb,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "campaign_partners" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" varchar NOT NULL,
	"business_id" varchar NOT NULL,
	"business_name" varchar NOT NULL,
	"business_category" varchar NOT NULL,
	"joined_at" timestamp DEFAULT now(),
	"status" varchar DEFAULT 'active',
	"contribution" jsonb
);
--> statement-breakpoint
CREATE TABLE "campaign_success_factors" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" varchar NOT NULL,
	"business_combination" jsonb NOT NULL,
	"campaign_type" varchar NOT NULL,
	"success_score" real NOT NULL,
	"customer_acquisition_rate" real,
	"customer_retention_rate" real,
	"cross_business_visit_rate" real,
	"avg_customer_lifetime_value" numeric(10, 2),
	"cost_per_acquisition" numeric(10, 2),
	"roi_multiplier" real,
	"key_success_factors" jsonb,
	"failure_points" jsonb,
	"optimal_timing" jsonb,
	"customer_feedback_score" real,
	"merchant_satisfaction_score" real,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "campaign_templates" (
	"id" varchar PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"category" varchar NOT NULL,
	"description" text NOT NULL,
	"business_types" text[],
	"collaboration_type" varchar NOT NULL,
	"rewards" jsonb NOT NULL,
	"duration" varchar NOT NULL,
	"difficulty" varchar NOT NULL,
	"estimated_roi" varchar NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" varchar NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"type" varchar NOT NULL,
	"value" numeric(10, 2),
	"points_awarded" integer DEFAULT 0,
	"tap_goal" integer DEFAULT 1,
	"max_redemptions" integer,
	"current_redemptions" integer DEFAULT 0,
	"gps_required" boolean DEFAULT false,
	"gps_radius" integer,
	"start_date" timestamp,
	"end_date" timestamp,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "community_challenges" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar NOT NULL,
	"description" text,
	"challenge_type" varchar NOT NULL,
	"category" varchar,
	"difficulty_level" varchar DEFAULT 'medium',
	"requirements" jsonb,
	"rewards" jsonb,
	"participant_count" integer DEFAULT 0,
	"completion_count" integer DEFAULT 0,
	"max_participants" integer,
	"sponsor_business_id" varchar,
	"is_global" boolean DEFAULT false,
	"start_date" timestamp,
	"end_date" timestamp,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "coordinator_earnings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coordinator_id" varchar NOT NULL,
	"territory_id" varchar,
	"business_id" varchar,
	"user_id" varchar,
	"source" varchar DEFAULT 'subscription',
	"plan_id" varchar,
	"description" varchar,
	"gross_amount_cents" integer NOT NULL,
	"share_pct" integer NOT NULL,
	"share_amount_cents" integer NOT NULL,
	"currency" varchar DEFAULT 'usd',
	"stripe_payment_intent_id" varchar,
	"period_month" varchar,
	"payout_id" varchar,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "coordinator_earnings_stripe_payment_intent_id_unique" UNIQUE("stripe_payment_intent_id")
);
--> statement-breakpoint
CREATE TABLE "coordinator_payouts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coordinator_id" varchar NOT NULL,
	"period_month" varchar,
	"total_share_cents" integer NOT NULL,
	"currency" varchar DEFAULT 'usd',
	"status" varchar DEFAULT 'pending',
	"method" varchar DEFAULT 'manual',
	"reference" varchar,
	"notes" text,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "coordinators" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"display_name" varchar,
	"plan_status" varchar DEFAULT 'trial',
	"plan_renews_at" timestamp,
	"share_pct" integer DEFAULT 85,
	"invited_by" varchar,
	"invite_token" varchar,
	"invite_expires_at" timestamp,
	"invite_accepted_at" timestamp,
	"invitation_email" varchar,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "coordinators_invite_token_unique" UNIQUE("invite_token")
);
--> statement-breakpoint
CREATE TABLE "cross_business_rewards" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partnership_id" varchar NOT NULL,
	"trigger_business_id" varchar NOT NULL,
	"reward_business_id" varchar NOT NULL,
	"reward_type" varchar NOT NULL,
	"reward_value" numeric(10, 2),
	"description" text,
	"conditions" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "customer_favorites" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" varchar NOT NULL,
	"customer_email" varchar,
	"device_fingerprint" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "customer_health_scores" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"business_id" varchar NOT NULL,
	"health_score" real NOT NULL,
	"churn_risk" varchar NOT NULL,
	"visit_prediction" integer,
	"spending_prediction" numeric(10, 2),
	"risk_factors" jsonb,
	"retention_strategies" jsonb,
	"last_calculated" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "customer_journey_maps" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" varchar NOT NULL,
	"visit_sequence" jsonb NOT NULL,
	"total_journey_value" numeric(10, 2),
	"journey_duration" integer,
	"journey_date" timestamp NOT NULL,
	"businesses_visited" integer,
	"avg_time_per_business" real,
	"total_distance_traveled" real,
	"journey_efficiency" real,
	"identified_patterns" jsonb,
	"cross_selling_opportunities" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "donation_campaign_members" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"donation_campaign_id" varchar NOT NULL,
	"business_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "donation_campaign_members_unique" UNIQUE("donation_campaign_id","business_id")
);
--> statement-breakpoint
CREATE TABLE "donation_campaigns" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nonprofit_id" varchar NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"donation_per_tap_cents" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true,
	"start_date" timestamp,
	"end_date" timestamp,
	"created_by_user_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "donations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"donation_campaign_id" varchar NOT NULL,
	"nonprofit_id" varchar,
	"business_id" varchar,
	"tap_id" varchar,
	"customer_email" varchar,
	"amount_cents" integer NOT NULL,
	"period_month" varchar,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "donations_campaign_tap_unique" UNIQUE("donation_campaign_id","tap_id")
);
--> statement-breakpoint
CREATE TABLE "event_business_campaigns" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" varchar NOT NULL,
	"business_id" varchar NOT NULL,
	"campaign_id" varchar,
	"special_offer" text,
	"target_audience" varchar,
	"radius" real,
	"is_active" boolean DEFAULT true,
	"impressions" integer DEFAULT 0,
	"clicks" integer DEFAULT 0,
	"conversions" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "friend_connections" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_a_id" varchar NOT NULL,
	"user_b_id" varchar NOT NULL,
	"status" varchar DEFAULT 'pending',
	"connection_source" varchar,
	"connected_at" timestamp,
	"shared_visits" integer DEFAULT 0,
	"mutual_rewards" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "friend_connections_user_pair_unique" UNIQUE("user_a_id","user_b_id")
);
--> statement-breakpoint
CREATE TABLE "group_campaign_members" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_campaign_id" varchar NOT NULL,
	"business_id" varchar NOT NULL,
	"status" varchar DEFAULT 'joined',
	"joined_at" timestamp DEFAULT now(),
	CONSTRAINT "group_campaign_members_unique" UNIQUE("group_campaign_id","business_id")
);
--> statement-breakpoint
CREATE TABLE "group_campaign_progress" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_campaign_id" varchar NOT NULL,
	"customer_email" varchar,
	"device_fingerprint" varchar,
	"visited_business_ids" jsonb DEFAULT '[]',
	"visit_count" integer DEFAULT 0,
	"completed_at" timestamp,
	"reward_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "group_campaigns" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"rule_type" varchar DEFAULT 'any_n' NOT NULL,
	"required_stores" integer DEFAULT 1,
	"reward_type" varchar DEFAULT 'discount',
	"reward_title" varchar,
	"reward_value" numeric(10, 2),
	"reward_points" integer DEFAULT 0,
	"created_by_user_id" varchar,
	"creator_type" varchar DEFAULT 'business',
	"territory_id" varchar,
	"is_open" boolean DEFAULT false,
	"is_featured" boolean DEFAULT false,
	"start_date" timestamp,
	"end_date" timestamp,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "local_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar NOT NULL,
	"description" text,
	"event_type" varchar NOT NULL,
	"location" varchar NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"attendee_count" integer,
	"business_impact" real,
	"is_verified" boolean DEFAULT false,
	"source" varchar,
	"external_id" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "local_market_data" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" varchar NOT NULL,
	"data_type" varchar NOT NULL,
	"date" timestamp NOT NULL,
	"data_points" jsonb,
	"insights" text,
	"recommendations" jsonb,
	"confidence_score" real,
	"is_actionable" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "merchant_pool_participants" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" varchar,
	"business_id" varchar,
	"agreed_contribution" numeric(10, 2) NOT NULL,
	"contribution_type" varchar NOT NULL,
	"contribution_description" text,
	"current_balance" numeric(10, 2) DEFAULT '0',
	"total_rewards_given" numeric(10, 2) DEFAULT '0',
	"settlement_preference" varchar NOT NULL,
	"joined_at" timestamp DEFAULT now(),
	"status" varchar DEFAULT 'active',
	"auto_approve_rewards" boolean DEFAULT false,
	"max_daily_reward_value" numeric(10, 2)
);
--> statement-breakpoint
CREATE TABLE "merchant_settlement_details" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"settlement_id" varchar,
	"business_id" varchar,
	"rewards_given" numeric(10, 2) NOT NULL,
	"rewards_received" numeric(10, 2) NOT NULL,
	"net_balance" numeric(10, 2) NOT NULL,
	"settlement_type" varchar NOT NULL,
	"payment_method" varchar,
	"payment_reference" varchar,
	"status" varchar DEFAULT 'pending',
	"processed_at" timestamp,
	"failure_reason" text
);
--> statement-breakpoint
CREATE TABLE "monthly_sales_summary" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" varchar NOT NULL,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"total_sales" numeric(10, 2) NOT NULL,
	"cirql_driven_sales" numeric(10, 2) DEFAULT '0.00',
	"cirql_roi" numeric(5, 2) DEFAULT '0.00',
	"total_customers" integer DEFAULT 0,
	"new_customers_from_cirql" integer DEFAULT 0,
	"retention_rate" numeric(5, 2) DEFAULT '0.00',
	"average_ticket_growth" numeric(5, 2) DEFAULT '0.00',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "nfc_tags" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" varchar NOT NULL,
	"campaign_id" varchar,
	"tag_identifier" varchar NOT NULL,
	"location" varchar,
	"custom_label" varchar,
	"description" text,
	"placement_notes" text,
	"is_active" boolean DEFAULT true,
	"total_taps" integer DEFAULT 0,
	"last_tap_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "nfc_tags_tag_identifier_unique" UNIQUE("tag_identifier")
);
--> statement-breakpoint
CREATE TABLE "platform_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar NOT NULL,
	"value" jsonb NOT NULL,
	"category" varchar NOT NULL,
	"description" text,
	"updated_by" varchar,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "platform_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "pool_reward_transactions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" varchar,
	"rewarding_business_id" varchar,
	"reward_value" numeric(10, 2) NOT NULL,
	"reward_type" varchar NOT NULL,
	"reward_description" text,
	"customer_id" varchar,
	"tap_id" varchar,
	"timestamp" timestamp DEFAULT now(),
	"status" varchar DEFAULT 'pending',
	"settlement_amount" numeric(10, 2),
	"settlement_method" varchar,
	"settlement_date" timestamp,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "pool_settlements" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" varchar,
	"settlement_period" varchar NOT NULL,
	"total_pool_rewards" numeric(10, 2) NOT NULL,
	"average_reward_per_merchant" numeric(10, 2) NOT NULL,
	"status" varchar DEFAULT 'pending',
	"created_at" timestamp DEFAULT now(),
	"processed_at" timestamp,
	"processing_notes" text
);
--> statement-breakpoint
CREATE TABLE "predictive_pricing" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" varchar NOT NULL,
	"item_category" varchar NOT NULL,
	"current_price" numeric(10, 2),
	"suggested_price" numeric(10, 2),
	"price_change_reason" text,
	"expected_demand_change" real,
	"expected_revenue_impact" numeric(10, 2),
	"market_factors" jsonb,
	"valid_from" timestamp,
	"valid_until" timestamp,
	"is_applied" boolean DEFAULT false,
	"applied_at" timestamp,
	"actual_impact" numeric(10, 2),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referrer_id" varchar NOT NULL,
	"referee_email" varchar NOT NULL,
	"referee_id" varchar,
	"status" varchar DEFAULT 'pending',
	"bonus_amount" numeric(10, 2),
	"bonus_paid" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "regional_offers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coordinator_id" varchar NOT NULL,
	"territory_id" varchar,
	"code" varchar NOT NULL,
	"description" varchar,
	"offer_type" varchar DEFAULT 'percent' NOT NULL,
	"value" varchar,
	"is_active" boolean DEFAULT true,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "regional_offers_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "reward_pool_campaigns" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"total_pool_value" numeric(10, 2),
	"status" varchar DEFAULT 'active',
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"settlement_method" varchar NOT NULL,
	"auto_settlement" boolean DEFAULT true,
	"settlement_schedule" varchar DEFAULT 'monthly',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"created_by" varchar
);
--> statement-breakpoint
CREATE TABLE "reward_pool_invoices" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"settlement_detail_id" varchar,
	"invoice_number" varchar NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"due_date" timestamp NOT NULL,
	"status" varchar DEFAULT 'pending',
	"sent_at" timestamp,
	"paid_at" timestamp,
	"payment_method" varchar,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "reward_pool_invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "rewards" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"business_id" varchar NOT NULL,
	"campaign_id" varchar,
	"tap_id" varchar,
	"type" varchar NOT NULL,
	"title" varchar NOT NULL,
	"description" text,
	"value" numeric(10, 2),
	"code" varchar,
	"is_redeemed" boolean DEFAULT false,
	"redeemed_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sales_data" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" varchar NOT NULL,
	"date" varchar NOT NULL,
	"total_sales" varchar NOT NULL,
	"cirql_driven_sales" varchar DEFAULT '0',
	"customer_count" integer DEFAULT 0,
	"new_customers" integer DEFAULT 0,
	"returning_customers" integer DEFAULT 0,
	"average_ticket" varchar DEFAULT '0.00',
	"notes" text,
	"input_method" varchar DEFAULT 'manual',
	"verification_status" varchar DEFAULT 'unverified',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_proof_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"business_id" varchar NOT NULL,
	"event_type" varchar NOT NULL,
	"visibility" varchar DEFAULT 'friends',
	"message" text,
	"metadata" jsonb,
	"view_count" integer DEFAULT 0,
	"interaction_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "subscription_plans" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"price" numeric(10, 2) NOT NULL,
	"billing_interval" varchar NOT NULL,
	"features" jsonb,
	"max_businesses" integer,
	"max_campaigns" integer,
	"max_nfc_tags" integer,
	"api_requests_per_month" integer,
	"has_advanced_analytics" boolean DEFAULT false,
	"has_ai_insights" boolean DEFAULT false,
	"has_priority_support" boolean DEFAULT false,
	"stripe_product_id" varchar,
	"stripe_price_id" varchar,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tap_trails" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"required_businesses" jsonb,
	"reward_value" numeric(10, 2),
	"points_awarded" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"start_date" timestamp,
	"end_date" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "taps" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tag_id" varchar NOT NULL,
	"business_id" varchar NOT NULL,
	"campaign_id" varchar,
	"customer_email" varchar NOT NULL,
	"customer_name" varchar,
	"points_earned" integer DEFAULT 0,
	"reward_value" numeric(10, 2),
	"device_fingerprint" varchar,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "team_memberships" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"role" varchar DEFAULT 'member',
	"joined_at" timestamp DEFAULT now(),
	"points_contributed" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	CONSTRAINT "team_memberships_team_user_unique" UNIQUE("team_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"leader_id" varchar NOT NULL,
	"max_members" integer DEFAULT 10,
	"current_members" integer DEFAULT 1,
	"team_type" varchar DEFAULT 'casual',
	"total_points" integer DEFAULT 0,
	"total_challenges_completed" integer DEFAULT 0,
	"team_level" integer DEFAULT 1,
	"team_badges" text[] DEFAULT '{}',
	"is_public" boolean DEFAULT true,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "territories" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coordinator_id" varchar NOT NULL,
	"name" varchar NOT NULL,
	"city" varchar,
	"state" varchar,
	"country" varchar DEFAULT 'US',
	"center_lat" real,
	"center_lng" real,
	"radius_meters" integer,
	"welcome_message" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "traffic_pattern_analysis" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" varchar NOT NULL,
	"day_of_week" integer NOT NULL,
	"hour_of_day" integer NOT NULL,
	"month" integer NOT NULL,
	"avg_customer_count" real,
	"avg_spend_per_customer" numeric(10, 2),
	"peak_traffic_score" real,
	"customer_demographics" jsonb,
	"seasonal_multiplier" real,
	"weather_correlation" real,
	"event_correlation" real,
	"last_updated" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_challenge_progress" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"challenge_id" varchar NOT NULL,
	"team_id" varchar,
	"progress" jsonb,
	"current_step" integer DEFAULT 0,
	"total_steps" integer,
	"is_completed" boolean DEFAULT false,
	"completed_at" timestamp,
	"points_earned" integer DEFAULT 0,
	"badges_earned" text[] DEFAULT '{}',
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "user_challenge_progress_user_challenge_unique" UNIQUE("user_id","challenge_id")
);
--> statement-breakpoint
CREATE TABLE "user_subscriptions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"plan_id" varchar NOT NULL,
	"status" varchar NOT NULL,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"cancel_at_period_end" boolean DEFAULT false,
	"stripe_subscription_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_trail_progress" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"trail_id" varchar NOT NULL,
	"completed_businesses" jsonb,
	"is_completed" boolean DEFAULT false,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"password_hash" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"role" varchar DEFAULT 'customer',
	"subscription_tier" varchar DEFAULT 'starter',
	"subscription_status" varchar DEFAULT 'active',
	"starter_expires_at" timestamp,
	"trial_discount_tier" varchar,
	"trial_discount_ends_at" timestamp,
	"trial_discount_active" boolean DEFAULT false,
	"stripe_customer_id" varchar,
	"stripe_subscription_id" varchar,
	"api_key" varchar,
	"api_key_created_at" timestamp,
	"total_points" integer DEFAULT 0,
	"available_points" integer DEFAULT 0,
	"tier" varchar DEFAULT 'Bronze',
	"referral_code" varchar,
	"referred_by" varchar,
	"age" integer,
	"location" varchar,
	"interests" text[] DEFAULT '{}',
	"shopping_preferences" text[] DEFAULT '{}',
	"dietary_restrictions" text[] DEFAULT '{}',
	"spending_habits" varchar,
	"social_media_activity" text[] DEFAULT '{}',
	"referral_source" varchar,
	"preferred_contact_method" varchar,
	"loyalty_tier" varchar DEFAULT 'Bronze',
	"total_points_earned" integer DEFAULT 0,
	"favorite_business_types" text[] DEFAULT '{}',
	"visit_frequency" varchar,
	"average_spend_range" varchar,
	"reward_points" integer DEFAULT 0,
	"customer_level" integer DEFAULT 1,
	"total_visits" integer DEFAULT 0,
	"badges" text[] DEFAULT '{}',
	"current_streak" integer DEFAULT 0,
	"longest_streak" integer DEFAULT 0,
	"team_id" varchar,
	"team_role" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_api_key_unique" UNIQUE("api_key"),
	CONSTRAINT "users_referral_code_unique" UNIQUE("referral_code")
);
--> statement-breakpoint
CREATE TABLE "viral_campaigns" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" varchar NOT NULL,
	"title" varchar NOT NULL,
	"description" text,
	"campaign_type" varchar NOT NULL,
	"viral_mechanic" varchar NOT NULL,
	"base_reward" numeric(10, 2),
	"viral_multiplier" real DEFAULT 1.5,
	"max_reward" numeric(10, 2),
	"participant_count" integer DEFAULT 0,
	"share_count" integer DEFAULT 0,
	"conversion_rate" real DEFAULT 0,
	"total_revenue" numeric(10, 2) DEFAULT 0,
	"start_date" timestamp,
	"end_date" timestamp,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "weather_triggers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" varchar NOT NULL,
	"weather_condition" varchar NOT NULL,
	"trigger_type" varchar NOT NULL,
	"threshold_value" real,
	"campaign_id" varchar,
	"custom_message" text,
	"discount_percentage" real,
	"is_active" boolean DEFAULT true,
	"last_triggered" timestamp,
	"trigger_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "winback_campaigns" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"business_id" varchar NOT NULL,
	"campaign_type" varchar NOT NULL,
	"trigger_reason" varchar NOT NULL,
	"offer_type" varchar NOT NULL,
	"offer_value" numeric(10, 2),
	"personalized_message" text,
	"sent_at" timestamp,
	"opened_at" timestamp,
	"clicked_at" timestamp,
	"redeemed_at" timestamp,
	"is_success" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "admin_communications" ADD CONSTRAINT "admin_communications_sender_id_admin_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_communications" ADD CONSTRAINT "admin_communications_recipient_id_admin_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_training_progress" ADD CONSTRAINT "admin_training_progress_admin_user_id_admin_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_training_progress" ADD CONSTRAINT "admin_training_progress_module_id_admin_training_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."admin_training_modules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_users" ADD CONSTRAINT "admin_users_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_users" ADD CONSTRAINT "admin_users_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_usage" ADD CONSTRAINT "api_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_addons" ADD CONSTRAINT "business_addons_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_goals" ADD CONSTRAINT "business_goals_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_pairing_scores" ADD CONSTRAINT "business_pairing_scores_business_a_id_businesses_id_fk" FOREIGN KEY ("business_a_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_pairing_scores" ADD CONSTRAINT "business_pairing_scores_business_b_id_businesses_id_fk" FOREIGN KEY ("business_b_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_partnerships" ADD CONSTRAINT "business_partnerships_business_a_id_businesses_id_fk" FOREIGN KEY ("business_a_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_partnerships" ADD CONSTRAINT "business_partnerships_business_b_id_businesses_id_fk" FOREIGN KEY ("business_b_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_recommendations" ADD CONSTRAINT "business_recommendations_for_business_id_businesses_id_fk" FOREIGN KEY ("for_business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_recommendations" ADD CONSTRAINT "business_recommendations_recommended_business_id_businesses_id_fk" FOREIGN KEY ("recommended_business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_reminders" ADD CONSTRAINT "business_reminders_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_reminders" ADD CONSTRAINT "business_reminders_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_tap_branding" ADD CONSTRAINT "business_tap_branding_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_territory_id_territories_id_fk" FOREIGN KEY ("territory_id") REFERENCES "public"."territories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_participations" ADD CONSTRAINT "campaign_participations_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_participations" ADD CONSTRAINT "campaign_participations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_partners" ADD CONSTRAINT "campaign_partners_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_success_factors" ADD CONSTRAINT "campaign_success_factors_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_challenges" ADD CONSTRAINT "community_challenges_sponsor_business_id_businesses_id_fk" FOREIGN KEY ("sponsor_business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coordinator_earnings" ADD CONSTRAINT "coordinator_earnings_coordinator_id_coordinators_id_fk" FOREIGN KEY ("coordinator_id") REFERENCES "public"."coordinators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coordinator_earnings" ADD CONSTRAINT "coordinator_earnings_territory_id_territories_id_fk" FOREIGN KEY ("territory_id") REFERENCES "public"."territories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coordinator_earnings" ADD CONSTRAINT "coordinator_earnings_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coordinator_earnings" ADD CONSTRAINT "coordinator_earnings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coordinator_payouts" ADD CONSTRAINT "coordinator_payouts_coordinator_id_coordinators_id_fk" FOREIGN KEY ("coordinator_id") REFERENCES "public"."coordinators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coordinators" ADD CONSTRAINT "coordinators_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coordinators" ADD CONSTRAINT "coordinators_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cross_business_rewards" ADD CONSTRAINT "cross_business_rewards_partnership_id_business_partnerships_id_fk" FOREIGN KEY ("partnership_id") REFERENCES "public"."business_partnerships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cross_business_rewards" ADD CONSTRAINT "cross_business_rewards_trigger_business_id_businesses_id_fk" FOREIGN KEY ("trigger_business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cross_business_rewards" ADD CONSTRAINT "cross_business_rewards_reward_business_id_businesses_id_fk" FOREIGN KEY ("reward_business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_favorites" ADD CONSTRAINT "customer_favorites_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_health_scores" ADD CONSTRAINT "customer_health_scores_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_health_scores" ADD CONSTRAINT "customer_health_scores_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_journey_maps" ADD CONSTRAINT "customer_journey_maps_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donation_campaign_members" ADD CONSTRAINT "donation_campaign_members_donation_campaign_id_donation_campaigns_id_fk" FOREIGN KEY ("donation_campaign_id") REFERENCES "public"."donation_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donation_campaign_members" ADD CONSTRAINT "donation_campaign_members_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donation_campaigns" ADD CONSTRAINT "donation_campaigns_nonprofit_id_businesses_id_fk" FOREIGN KEY ("nonprofit_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donation_campaigns" ADD CONSTRAINT "donation_campaigns_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donations" ADD CONSTRAINT "donations_donation_campaign_id_donation_campaigns_id_fk" FOREIGN KEY ("donation_campaign_id") REFERENCES "public"."donation_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donations" ADD CONSTRAINT "donations_nonprofit_id_businesses_id_fk" FOREIGN KEY ("nonprofit_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donations" ADD CONSTRAINT "donations_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donations" ADD CONSTRAINT "donations_tap_id_taps_id_fk" FOREIGN KEY ("tap_id") REFERENCES "public"."taps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_business_campaigns" ADD CONSTRAINT "event_business_campaigns_event_id_local_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."local_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_business_campaigns" ADD CONSTRAINT "event_business_campaigns_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_business_campaigns" ADD CONSTRAINT "event_business_campaigns_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friend_connections" ADD CONSTRAINT "friend_connections_user_a_id_users_id_fk" FOREIGN KEY ("user_a_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friend_connections" ADD CONSTRAINT "friend_connections_user_b_id_users_id_fk" FOREIGN KEY ("user_b_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_campaign_members" ADD CONSTRAINT "group_campaign_members_group_campaign_id_group_campaigns_id_fk" FOREIGN KEY ("group_campaign_id") REFERENCES "public"."group_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_campaign_members" ADD CONSTRAINT "group_campaign_members_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_campaign_progress" ADD CONSTRAINT "group_campaign_progress_group_campaign_id_group_campaigns_id_fk" FOREIGN KEY ("group_campaign_id") REFERENCES "public"."group_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_campaign_progress" ADD CONSTRAINT "group_campaign_progress_reward_id_rewards_id_fk" FOREIGN KEY ("reward_id") REFERENCES "public"."rewards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_campaigns" ADD CONSTRAINT "group_campaigns_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_campaigns" ADD CONSTRAINT "group_campaigns_territory_id_territories_id_fk" FOREIGN KEY ("territory_id") REFERENCES "public"."territories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "local_market_data" ADD CONSTRAINT "local_market_data_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_pool_participants" ADD CONSTRAINT "merchant_pool_participants_campaign_id_reward_pool_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."reward_pool_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_pool_participants" ADD CONSTRAINT "merchant_pool_participants_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_settlement_details" ADD CONSTRAINT "merchant_settlement_details_settlement_id_pool_settlements_id_fk" FOREIGN KEY ("settlement_id") REFERENCES "public"."pool_settlements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_settlement_details" ADD CONSTRAINT "merchant_settlement_details_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_sales_summary" ADD CONSTRAINT "monthly_sales_summary_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfc_tags" ADD CONSTRAINT "nfc_tags_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfc_tags" ADD CONSTRAINT "nfc_tags_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_settings" ADD CONSTRAINT "platform_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pool_reward_transactions" ADD CONSTRAINT "pool_reward_transactions_campaign_id_reward_pool_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."reward_pool_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pool_reward_transactions" ADD CONSTRAINT "pool_reward_transactions_rewarding_business_id_businesses_id_fk" FOREIGN KEY ("rewarding_business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pool_reward_transactions" ADD CONSTRAINT "pool_reward_transactions_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pool_reward_transactions" ADD CONSTRAINT "pool_reward_transactions_tap_id_taps_id_fk" FOREIGN KEY ("tap_id") REFERENCES "public"."taps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pool_settlements" ADD CONSTRAINT "pool_settlements_campaign_id_reward_pool_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."reward_pool_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "predictive_pricing" ADD CONSTRAINT "predictive_pricing_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_id_users_id_fk" FOREIGN KEY ("referrer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referee_id_users_id_fk" FOREIGN KEY ("referee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "regional_offers" ADD CONSTRAINT "regional_offers_coordinator_id_coordinators_id_fk" FOREIGN KEY ("coordinator_id") REFERENCES "public"."coordinators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "regional_offers" ADD CONSTRAINT "regional_offers_territory_id_territories_id_fk" FOREIGN KEY ("territory_id") REFERENCES "public"."territories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_pool_campaigns" ADD CONSTRAINT "reward_pool_campaigns_created_by_businesses_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_pool_invoices" ADD CONSTRAINT "reward_pool_invoices_settlement_detail_id_merchant_settlement_details_id_fk" FOREIGN KEY ("settlement_detail_id") REFERENCES "public"."merchant_settlement_details"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rewards" ADD CONSTRAINT "rewards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rewards" ADD CONSTRAINT "rewards_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rewards" ADD CONSTRAINT "rewards_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rewards" ADD CONSTRAINT "rewards_tap_id_taps_id_fk" FOREIGN KEY ("tap_id") REFERENCES "public"."taps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_data" ADD CONSTRAINT "sales_data_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_proof_events" ADD CONSTRAINT "social_proof_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_proof_events" ADD CONSTRAINT "social_proof_events_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taps" ADD CONSTRAINT "taps_tag_id_nfc_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."nfc_tags"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taps" ADD CONSTRAINT "taps_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taps" ADD CONSTRAINT "taps_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_leader_id_users_id_fk" FOREIGN KEY ("leader_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "territories" ADD CONSTRAINT "territories_coordinator_id_coordinators_id_fk" FOREIGN KEY ("coordinator_id") REFERENCES "public"."coordinators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "traffic_pattern_analysis" ADD CONSTRAINT "traffic_pattern_analysis_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_challenge_progress" ADD CONSTRAINT "user_challenge_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_challenge_progress" ADD CONSTRAINT "user_challenge_progress_challenge_id_community_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."community_challenges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_challenge_progress" ADD CONSTRAINT "user_challenge_progress_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_trail_progress" ADD CONSTRAINT "user_trail_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_trail_progress" ADD CONSTRAINT "user_trail_progress_trail_id_tap_trails_id_fk" FOREIGN KEY ("trail_id") REFERENCES "public"."tap_trails"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "viral_campaigns" ADD CONSTRAINT "viral_campaigns_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weather_triggers" ADD CONSTRAINT "weather_triggers_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weather_triggers" ADD CONSTRAINT "weather_triggers_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "winback_campaigns" ADD CONSTRAINT "winback_campaigns_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "winback_campaigns" ADD CONSTRAINT "winback_campaigns_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");