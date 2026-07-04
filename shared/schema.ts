import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  integer,
  boolean,
  text,
  decimal,
  uuid,
  primaryKey,
  unique,
  real,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table (required for auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  passwordHash: varchar("password_hash"), // scrypt salt:hash for local auth; null for OAuth-only accounts
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").default("customer"), // customer, merchant, admin, coordinator
  subscriptionTier: varchar("subscription_tier").default("starter"), // starter, professional, business, enterprise
  subscriptionStatus: varchar("subscription_status").default("active"), // active, cancelled, expired
  // Admin account suspension (blocks login + active sessions; separate from
  // subscription status). Set via the admin Support 360 view.
  suspended: boolean("suspended").default(false),
  suspendedAt: timestamp("suspended_at"),
  suspendedReason: varchar("suspended_reason"),
  starterExpiresAt: timestamp("starter_expires_at"), // 6 months from signup for starter tier
  trialDiscountTier: varchar("trial_discount_tier"), // Selected tier during trial for 50% discount
  trialDiscountEndsAt: timestamp("trial_discount_ends_at"), // When 50% discount expires
  trialDiscountActive: boolean("trial_discount_active").default(false),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  // Billing enforcement (Phase 1). `paidThroughDate` = end of the last paid
  // service period; `pastDueSince` = when the current delinquency began (null
  // when current). Together they drive the grace/locked/suspended states — see
  // server/billing-state.ts. In Phase 3 these are set from Stripe invoice
  // webhooks; until then they can be set by the admin billing control / scheduler.
  paidThroughDate: timestamp("paid_through_date"),
  pastDueSince: timestamp("past_due_since"),
  // Dunning-email idempotency (Phase 2): stamped when the lock / suspension
  // notice is sent for the current delinquency; both reset to null when the
  // account becomes current again, so a future delinquency re-notifies.
  billingLockNotifiedAt: timestamp("billing_lock_notified_at"),
  billingSuspendNotifiedAt: timestamp("billing_suspend_notified_at"),
  apiKey: varchar("api_key").unique(), // for API access to both Cirql and InSpektAI
  apiKeyCreatedAt: timestamp("api_key_created_at"),
  totalPoints: integer("total_points").default(0),
  availablePoints: integer("available_points").default(0),
  tier: varchar("tier").default("Bronze"), // Bronze, Silver, Gold, Platinum
  referralCode: varchar("referral_code").unique(),
  referredBy: varchar("referred_by"),
  // Customer profile enhancement for better targeting
  age: integer("age"),
  location: varchar("location"),
  interests: text("interests").array().default(sql`'{}'`),
  shoppingPreferences: text("shopping_preferences").array().default(sql`'{}'`),
  dietaryRestrictions: text("dietary_restrictions").array().default(sql`'{}'`),
  spendingHabits: varchar("spending_habits"),
  socialMediaActivity: text("social_media_activity").array().default(sql`'{}'`),
  referralSource: varchar("referral_source"),
  preferredContactMethod: varchar("preferred_contact_method"),
  loyaltyTier: varchar("loyalty_tier").default("Bronze"),
  totalPointsEarned: integer("total_points_earned").default(0),
  favoriteBusinessTypes: text("favorite_business_types").array().default(sql`'{}'`),
  visitFrequency: varchar("visit_frequency"),
  averageSpendRange: varchar("average_spend_range"),
  // Basic Gamification
  rewardPoints: integer("reward_points").default(0),
  customerLevel: integer("customer_level").default(1),
  totalVisits: integer("total_visits").default(0),
  badges: text("badges").array().default(sql`'{}'`),
  currentStreak: integer("current_streak").default(0),
  longestStreak: integer("longest_streak").default(0),
  streakLastDate: varchar("streak_last_date"), // YYYY-MM-DD of the last tap that counted toward the streak
  lastSpinDate: varchar("last_spin_date"),     // YYYY-MM-DD of the last daily spin
  teamId: varchar("team_id"),
  teamRole: varchar("team_role"), // leader, member, scout
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Businesses table
export const businesses = pgTable("businesses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  address: varchar("address"),
  latitude: real("latitude"),   // for the discovery map
  longitude: real("longitude"),
  phone: varchar("phone"),
  email: varchar("email"),
  website: varchar("website"),
  logo: varchar("logo"),
  ownerId: varchar("owner_id").references(() => users.id),
  territoryId: varchar("territory_id").references(() => territories.id), // CHR-31: coordinator territory scoping
  // Stripe Connect (Express) — so a business can RECEIVE automated payouts (e.g.
  // its share owed as a shared-campaign host). Onboarding is Stripe-hosted.
  stripeConnectAccountId: varchar("stripe_connect_account_id"),
  connectPayoutsEnabled: boolean("connect_payouts_enabled").default(false),
  connectDetailsSubmitted: boolean("connect_details_submitted").default(false),
  connectOnboardedAt: timestamp("connect_onboarded_at"),
  verificationStatus: varchar("verification_status").default("unverified"), // CHR-31: unverified, verified, rejected (coordinator-verified)
  isFeatured: boolean("is_featured").default(false), // CHR-54: coordinator-controlled map promotion (territory-scoped)
  // CHR-34/70: 501(c)(3) nonprofit participation. A nonprofit is a business row
  // flagged isNonprofit (free plan — no subscription charge).
  isNonprofit: boolean("is_nonprofit").default(false),
  ein: varchar("ein"), // 501(c)(3) tax id
  nonprofitMission: text("nonprofit_mission"),
  isActive: boolean("is_active").default(true),
  totalTaps: integer("total_taps").default(0),
  totalRewardsGiven: integer("total_rewards_given").default(0),
  // Business descriptors for inclusive challenge grouping (collected during account setup)
  businessDescriptors: text("business_descriptors").array().default(sql`'{}'`),
  culturalBackground: varchar("cultural_background"),
  communityFocus: text("community_focus").array().default(sql`'{}'`),
  accessibilityFeatures: text("accessibility_features").array().default(sql`'{}'`),
  sustainabilityPractices: text("sustainability_practices").array().default(sql`'{}'`),
  businessMaturity: varchar("business_maturity"), // new/established/veteran/legacy
  establishmentType: text("establishment_type").array().default(sql`'{}'`),
  specialtyFeatures: text("specialty_features").array().default(sql`'{}'`),
  priceRange: varchar("price_range"), // budget/moderate/premium/luxury
  // Enhanced marketing fields
  targetDemographics: text("target_demographics").array().default(sql`'{}'`),
  peakHours: text("peak_hours").array().default(sql`'{}'`),
  seasonalPatterns: text("seasonal_patterns").array().default(sql`'{}'`),
  customerCapacity: integer("customer_capacity"),
  averageVisitDuration: varchar("average_visit_duration"),
  primaryProducts: text("primary_products").array().default(sql`'{}'`),
  uniqueSellingPoints: text("unique_selling_points").array().default(sql`'{}'`),
  competitorAdvantages: text("competitor_advantages").array().default(sql`'{}'`),
  marketingGoals: text("marketing_goals").array().default(sql`'{}'`),
  customerRetentionRate: varchar("customer_retention_rate"),
  averageSpendPerCustomer: varchar("average_spend_per_customer"),
  socialMediaPresence: text("social_media_presence").array().default(sql`'{}'`),
  eventHostingCapability: boolean("event_hosting_capability").default(false),
  loyaltyProgramInterest: varchar("loyalty_program_interest"),
  marketingBudget: varchar("marketing_budget"),
  // Real Sales Data Fields
  enableSalesTracking: boolean("enable_sales_tracking").default(false),
  salesDataSource: varchar("sales_data_source").default("manual"), // manual, pos_integration, csv_upload
  // Business Website Hosting
  websiteEnabled: boolean("website_enabled").default(false),
  customDomain: varchar("custom_domain"),
  websiteSlug: varchar("website_slug").unique(),
  websiteTheme: varchar("website_theme").default("modern"),
  websiteContent: jsonb("website_content"),
  websiteMenu: jsonb("website_menu"),
  websiteServices: jsonb("website_services"),
  websiteHours: jsonb("website_hours"),
  websiteSocialLinks: jsonb("website_social_links"),
  websiteGallery: text("website_gallery").array().default(sql`'{}'`),
  websitePublished: boolean("website_published").default(false),
  websiteViews: integer("website_views").default(0),
  websiteLastUpdated: timestamp("website_last_updated"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ── Community Coordinator / territory system (CHR-31) ──
// A coordinator is a `users` row (role='coordinator') PLUS a `coordinators`
// record — mirroring how an admin is a `users` row plus an `admin_users` record.
// The coordinators record is the real gate; it holds coordinator-specific state.
export const coordinators = pgTable("coordinators", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  displayName: varchar("display_name"),
  planStatus: varchar("plan_status").default("trial"), // trial, active, past_due, cancelled
  planRenewsAt: timestamp("plan_renews_at"),
  sharePct: integer("share_pct").default(70), // CHR-32/61: coordinator revenue-share % on gross (owner decision: 70/30 split)
  // Invitation (mirrors the admin invite flow)
  invitedBy: varchar("invited_by").references(() => users.id),
  inviteToken: varchar("invite_token").unique(),
  inviteExpiresAt: timestamp("invite_expires_at"),
  inviteAcceptedAt: timestamp("invite_accepted_at"),
  invitationEmail: varchar("invitation_email"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// A licensed region managed by one coordinator. Region starts simple (city/state
// + an optional circular area); polygon bounds can come later.
export const territories = pgTable("territories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  coordinatorId: varchar("coordinator_id").references(() => coordinators.id).notNull(),
  name: varchar("name").notNull(),
  city: varchar("city"),
  state: varchar("state"),
  country: varchar("country").default("US"),
  centerLat: real("center_lat"),      // for map scoping / "is this business in my territory"
  centerLng: real("center_lng"),
  radiusMeters: integer("radius_meters"),
  welcomeMessage: text("welcome_message"), // CHR-55: regional default shown to new businesses
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// CHR-55: regional discount codes & trial offers a coordinator issues within
// their territory.
export const regionalOffers = pgTable("regional_offers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  coordinatorId: varchar("coordinator_id").references(() => coordinators.id).notNull(),
  territoryId: varchar("territory_id").references(() => territories.id),
  code: varchar("code").unique().notNull(),
  description: varchar("description"),
  offerType: varchar("offer_type").notNull().default("percent"), // percent, fixed, trial
  value: varchar("value"), // e.g. "15" (percent), "5.00" (fixed), "30" (trial days)
  isActive: boolean("is_active").default(true),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ── CHR-32 / CHR-61: coordinator revenue-share ledger ──
// One row per verified charge attributed to a territory's coordinator. Written
// from the Stripe webhook (payment_intent.succeeded). Idempotent on the payment
// intent id so webhook retries never double-record.
export const coordinatorEarnings = pgTable("coordinator_earnings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  coordinatorId: varchar("coordinator_id").references(() => coordinators.id).notNull(),
  territoryId: varchar("territory_id").references(() => territories.id),
  businessId: varchar("business_id").references(() => businesses.id), // payer's business
  userId: varchar("user_id").references(() => users.id), // the payer
  source: varchar("source").default("subscription"), // subscription | addon
  planId: varchar("plan_id"),
  description: varchar("description"),
  grossAmountCents: integer("gross_amount_cents").notNull(),
  sharePct: integer("share_pct").notNull(), // snapshot of coordinator rate at time of charge
  shareAmountCents: integer("share_amount_cents").notNull(),
  currency: varchar("currency").default("usd"),
  stripePaymentIntentId: varchar("stripe_payment_intent_id").unique(), // idempotency key
  periodMonth: varchar("period_month"), // YYYY-MM for monthly aggregation
  payoutId: varchar("payout_id"), // CHR-64: set once this earning is rolled into a payout
  createdAt: timestamp("created_at").defaultNow(),
});

// ── CHR-32 / CHR-64: coordinator payouts (reporting-only ledger) ──
// A payout rolls up a coordinator's unpaid earnings for a period. Reporting-only
// for now (status/mark-paid tracked by an admin); Stripe Connect transfers are a
// documented follow-up (method='stripe_connect').
export const coordinatorPayouts = pgTable("coordinator_payouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  coordinatorId: varchar("coordinator_id").references(() => coordinators.id).notNull(),
  periodMonth: varchar("period_month"), // YYYY-MM (or null for ad-hoc)
  totalShareCents: integer("total_share_cents").notNull(),
  currency: varchar("currency").default("usd"),
  status: varchar("status").default("pending"), // pending | paid | void
  method: varchar("method").default("manual"), // manual | stripe_connect
  reference: varchar("reference"), // external payout/transfer reference
  notes: text("notes"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ── CHR-35 / CHR-65: per-business add-on entitlements ──
// A business unlocks a paid add-on (map priority, advanced analytics, custom
// branding, scavenger builder) by purchasing it. Activation-based for now;
// recurring/renewal billing is a documented follow-up.
export const businessAddons = pgTable("business_addons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").references(() => businesses.id).notNull(),
  addonKey: varchar("addon_key").notNull(), // map_priority | advanced_analytics | custom_branding | scavenger_builder
  status: varchar("status").default("active"), // active | cancelled
  source: varchar("source").default("stripe"), // stripe | manual
  stripePaymentIntentId: varchar("stripe_payment_intent_id"), // idempotency for the activating charge
  activatedAt: timestamp("activated_at").defaultNow(),
  expiresAt: timestamp("expires_at"), // null = no expiry (activation-based)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueEntitlement: unique("business_addons_unique").on(table.businessId, table.addonKey),
}));

// ── CHR-35 / CHR-68: custom tap-screen branding (add-on) ──
// Per-business branding for the customer tap page. Applied only while the
// business holds the custom_branding entitlement (enforced in the routes).
export const businessTapBranding = pgTable("business_tap_branding", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").references(() => businesses.id).notNull().unique(),
  brandColor: varchar("brand_color"), // primary hex
  accentColor: varchar("accent_color"),
  slogan: varchar("slogan"),
  logoUrl: varchar("logo_url"),
  links: jsonb("links").default(sql`'[]'`), // [{ label, url }]
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ── CHR-36 / CHR-75: customer favorites + business reminders ──
// Anonymous-friendly: a customer is identified by email and/or the CHR-48 device
// fingerprint (no account needed).
export const customerFavorites = pgTable("customer_favorites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").references(() => businesses.id).notNull(),
  customerEmail: varchar("customer_email"),
  deviceFingerprint: varchar("device_fingerprint"),
  createdAt: timestamp("created_at").defaultNow(),
});

// A stored prompt a business posts to its favoriters. Delivery (email/push) is a
// documented future follow-up; this is the feed source.
export const businessReminders = pgTable("business_reminders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").references(() => businesses.id).notNull(),
  message: text("message").notNull(),
  createdByUserId: varchar("created_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── CHR-34 / CHR-71: donation-per-tap campaigns ──
// A nonprofit runs "tap at these shops to support us — each store donates $X per
// tap." Donations accrue per tap and are attributed to the nonprofit.
export const donationCampaigns = pgTable("donation_campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nonprofitId: varchar("nonprofit_id").references(() => businesses.id).notNull(),
  name: varchar("name").notNull(),
  description: text("description"),
  donationPerTapCents: integer("donation_per_tap_cents").notNull().default(0),
  isActive: boolean("is_active").default(true),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  createdByUserId: varchar("created_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const donationCampaignMembers = pgTable("donation_campaign_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  donationCampaignId: varchar("donation_campaign_id").references(() => donationCampaigns.id).notNull(),
  businessId: varchar("business_id").references(() => businesses.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueMember: unique("donation_campaign_members_unique").on(table.donationCampaignId, table.businessId),
}));

// One row per accrued donation. Unique (campaign, tap) makes accrual idempotent.
export const donations = pgTable("donations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  donationCampaignId: varchar("donation_campaign_id").references(() => donationCampaigns.id).notNull(),
  nonprofitId: varchar("nonprofit_id").references(() => businesses.id),
  businessId: varchar("business_id").references(() => businesses.id), // store that donated
  tapId: varchar("tap_id").references(() => taps.id),
  customerEmail: varchar("customer_email"),
  amountCents: integer("amount_cents").notNull(),
  periodMonth: varchar("period_month"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniquePerTap: unique("donations_campaign_tap_unique").on(table.donationCampaignId, table.tapId),
}));

// ── CHR-33: first-class multi-store group campaigns ──
// Supersedes the older (all-mock, unused) business_partnerships / reward_pool_*
// tables — those are slated for retirement in CHR-58.
export const groupCampaigns = pgTable("group_campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  ruleType: varchar("rule_type").notNull().default("any_n"), // any_n = tap N of M | all
  requiredStores: integer("required_stores").default(1), // N for any_n
  rewardType: varchar("reward_type").default("discount"), // discount, free_item, points
  rewardTitle: varchar("reward_title"),
  rewardValue: decimal("reward_value", { precision: 10, scale: 2 }),
  rewardPoints: integer("reward_points").default(0),
  // The host that FUNDS and redeems a tangible reward (discount/free_item).
  // Null for points (platform-funded). Fixes the old "arbitrary completing store
  // pays" attribution — a funded reward is always attributed to this host.
  fundingBusinessId: varchar("funding_business_id").references(() => businesses.id),
  createdByUserId: varchar("created_by_user_id").references(() => users.id),
  creatorType: varchar("creator_type").default("business"), // business | coordinator
  territoryId: varchar("territory_id").references(() => territories.id), // set for coordinator city-wide
  isOpen: boolean("is_open").default(false), // businesses may self-join
  isFeatured: boolean("is_featured").default(false), // CHR-54: coordinator promotes this campaign on the discovery map
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const groupCampaignMembers = pgTable("group_campaign_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupCampaignId: varchar("group_campaign_id").references(() => groupCampaigns.id).notNull(),
  businessId: varchar("business_id").references(() => businesses.id).notNull(),
  status: varchar("status").default("joined"), // invited | joined
  joinedAt: timestamp("joined_at").defaultNow(),
}, (table) => ({
  uniqueMember: unique("group_campaign_members_unique").on(table.groupCampaignId, table.businessId),
}));

// One row per (campaign, customer). Customer is identified WITHOUT an account —
// by email and/or the CHR-48 device fingerprint. Tracks which member stores
// have been visited and, once complete, the unlocked reward.
export const groupCampaignProgress = pgTable("group_campaign_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupCampaignId: varchar("group_campaign_id").references(() => groupCampaigns.id).notNull(),
  customerEmail: varchar("customer_email"),
  deviceFingerprint: varchar("device_fingerprint"),
  visitedBusinessIds: jsonb("visited_business_ids").default(sql`'[]'`), // array of member business ids
  visitCount: integer("visit_count").default(0),
  completedAt: timestamp("completed_at"),
  rewardId: varchar("reward_id").references(() => rewards.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Campaigns table
export const campaigns = pgTable("campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").references(() => businesses.id).notNull(),
  name: varchar("name").notNull(),
  description: text("description"),
  type: varchar("type").notNull(), // discount, loyalty, referral, trail
  value: decimal("value", { precision: 10, scale: 2 }),
  pointsAwarded: integer("points_awarded").default(0),
  tapGoal: integer("tap_goal").default(1), // CHR-73: taps needed per reward (>1 = punch-card)
  maxRedemptions: integer("max_redemptions"),
  currentRedemptions: integer("current_redemptions").default(0),
  gpsRequired: boolean("gps_required").default(false), // CHR-48: gate reward on proximity
  gpsRadius: integer("gps_radius"), // CHR-48: allowed distance from business in metres (default applied in code)
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// NFC Tags table
export const nfcTags = pgTable("nfc_tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").references(() => businesses.id).notNull(),
  campaignId: varchar("campaign_id").references(() => campaigns.id),
  tagIdentifier: varchar("tag_identifier").unique().notNull(),
  location: varchar("location"), // where the tag is placed
  customLabel: varchar("custom_label"), // friendly name for internal reference
  description: text("description"), // what customers should expect
  placementNotes: text("placement_notes"), // optimal placement notes
  isActive: boolean("is_active").default(true),
  totalTaps: integer("total_taps").default(0),
  lastTapAt: timestamp("last_tap_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Taps table (records each NFC tap)
export const taps = pgTable("taps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tagId: varchar("tag_id").references(() => nfcTags.id).notNull(),
  businessId: varchar("business_id").references(() => businesses.id).notNull(),
  campaignId: varchar("campaign_id").references(() => campaigns.id),
  customerEmail: varchar("customer_email").notNull(),
  customerName: varchar("customer_name"),
  pointsEarned: integer("points_earned").default(0),
  rewardValue: decimal("reward_value", { precision: 10, scale: 2 }),
  deviceFingerprint: varchar("device_fingerprint"), // CHR-48: client device id for anti-abuse (no-account customers)
  metadata: jsonb("metadata"), // additional data like device info, location
  createdAt: timestamp("created_at").defaultNow(),
});

// Rewards table (earned rewards)
export const rewards = pgTable("rewards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  businessId: varchar("business_id").references(() => businesses.id).notNull(),
  campaignId: varchar("campaign_id").references(() => campaigns.id),
  tapId: varchar("tap_id").references(() => taps.id),
  type: varchar("type").notNull(), // discount, free_item, points, cashback
  title: varchar("title").notNull(),
  description: text("description"),
  value: decimal("value", { precision: 10, scale: 2 }),
  code: varchar("code"), // redemption code
  isRedeemed: boolean("is_redeemed").default(false),
  redeemedAt: timestamp("redeemed_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Referrals table
export const referrals = pgTable("referrals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referrerId: varchar("referrer_id").references(() => users.id).notNull(),
  refereeEmail: varchar("referee_email").notNull(),
  refereeId: varchar("referee_id").references(() => users.id),
  status: varchar("status").default("pending"), // pending, completed, rewarded
  bonusAmount: decimal("bonus_amount", { precision: 10, scale: 2 }),
  bonusPaid: boolean("bonus_paid").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Tap Trails table (multi-business challenges)
export const tapTrails = pgTable("tap_trails", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  requiredBusinesses: jsonb("required_businesses"), // array of business IDs
  rewardValue: decimal("reward_value", { precision: 10, scale: 2 }),
  pointsAwarded: integer("points_awarded").default(0),
  isActive: boolean("is_active").default(true),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

// User Trail Progress table
export const userTrailProgress = pgTable("user_trail_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  trailId: varchar("trail_id").references(() => tapTrails.id).notNull(),
  completedBusinesses: jsonb("completed_businesses"), // array of completed business IDs
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Subscription Plans table
export const subscriptionPlans = pgTable("subscription_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(), // Free, Basic, Premium, Enterprise
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  billingInterval: varchar("billing_interval").notNull(), // monthly, yearly
  features: jsonb("features"), // array of features
  maxBusinesses: integer("max_businesses"),
  maxCampaigns: integer("max_campaigns"),
  maxNfcTags: integer("max_nfc_tags"),
  apiRequestsPerMonth: integer("api_requests_per_month"),
  hasAdvancedAnalytics: boolean("has_advanced_analytics").default(false),
  hasAiInsights: boolean("has_ai_insights").default(false),
  hasPrioritySupport: boolean("has_priority_support").default(false),
  stripeProductId: varchar("stripe_product_id"),
  stripePriceId: varchar("stripe_price_id"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// API Usage Tracking table
export const apiUsage = pgTable("api_usage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  endpoint: varchar("endpoint").notNull(),
  method: varchar("method").notNull(),
  requestsCount: integer("requests_count").default(1),
  responseTime: integer("response_time"), // in milliseconds
  statusCode: integer("status_code"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
  month: varchar("month").notNull(), // YYYY-MM for monthly aggregation
});

// User Subscriptions table
export const userSubscriptions = pgTable("user_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  planId: varchar("plan_id").references(() => subscriptionPlans.id).notNull(),
  status: varchar("status").notNull(), // active, cancelled, past_due, unpaid
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const userRelations = relations(users, ({ many, one }) => ({
  businesses: many(businesses),
  rewards: many(rewards),
  referralsMade: many(referrals, { relationName: "referrer" }),
  referralsReceived: many(referrals, { relationName: "referee" }),
  trailProgress: many(userTrailProgress),
  subscriptions: many(userSubscriptions),
  apiUsage: many(apiUsage),
}));

export const businessRelations = relations(businesses, ({ many, one }) => ({
  owner: one(users, { fields: [businesses.ownerId], references: [users.id] }),
  campaigns: many(campaigns),
  nfcTags: many(nfcTags),
  taps: many(taps),
  rewards: many(rewards),
}));

export const campaignRelations = relations(campaigns, ({ many, one }) => ({
  business: one(businesses, { fields: [campaigns.businessId], references: [businesses.id] }),
  nfcTags: many(nfcTags),
  taps: many(taps),
  rewards: many(rewards),
}));

export const nfcTagRelations = relations(nfcTags, ({ many, one }) => ({
  business: one(businesses, { fields: [nfcTags.businessId], references: [businesses.id] }),
  campaign: one(campaigns, { fields: [nfcTags.campaignId], references: [campaigns.id] }),
  taps: many(taps),
}));

export const tapRelations = relations(taps, ({ one }) => ({
  tag: one(nfcTags, { fields: [taps.tagId], references: [nfcTags.id] }),
  business: one(businesses, { fields: [taps.businessId], references: [businesses.id] }),
  campaign: one(campaigns, { fields: [taps.campaignId], references: [campaigns.id] }),
  reward: one(rewards, { fields: [taps.id], references: [rewards.tapId] }),
}));

export const rewardRelations = relations(rewards, ({ one }) => ({
  user: one(users, { fields: [rewards.userId], references: [users.id] }),
  business: one(businesses, { fields: [rewards.businessId], references: [businesses.id] }),
  campaign: one(campaigns, { fields: [rewards.campaignId], references: [campaigns.id] }),
  tap: one(taps, { fields: [rewards.tapId], references: [taps.id] }),
}));

export const referralRelations = relations(referrals, ({ one }) => ({
  referrer: one(users, { fields: [referrals.referrerId], references: [users.id], relationName: "referrer" }),
  referee: one(users, { fields: [referrals.refereeId], references: [users.id], relationName: "referee" }),
}));

export const tapTrailRelations = relations(tapTrails, ({ many }) => ({
  userProgress: many(userTrailProgress),
}));

export const userTrailProgressRelations = relations(userTrailProgress, ({ one }) => ({
  user: one(users, { fields: [userTrailProgress.userId], references: [users.id] }),
  trail: one(tapTrails, { fields: [userTrailProgress.trailId], references: [tapTrails.id] }),
}));

export const subscriptionPlanRelations = relations(subscriptionPlans, ({ many }) => ({
  subscriptions: many(userSubscriptions),
}));

export const userSubscriptionRelations = relations(userSubscriptions, ({ one }) => ({
  user: one(users, { fields: [userSubscriptions.userId], references: [users.id] }),
  plan: one(subscriptionPlans, { fields: [userSubscriptions.planId], references: [subscriptionPlans.id] }),
}));

export const apiUsageRelations = relations(apiUsage, ({ one }) => ({
  user: one(users, { fields: [apiUsage.userId], references: [users.id] }),
}));

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const insertBusinessSchema = createInsertSchema(businesses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  totalTaps: true,
  totalRewardsGiven: true,
});

// CHR-31 coordinator/territory model
export const insertCoordinatorSchema = createInsertSchema(coordinators).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTerritorySchema = createInsertSchema(territories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRegionalOfferSchema = createInsertSchema(regionalOffers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCoordinatorEarningSchema = createInsertSchema(coordinatorEarnings).omit({
  id: true,
  createdAt: true,
});

export const insertCoordinatorPayoutSchema = createInsertSchema(coordinatorPayouts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBusinessAddonSchema = createInsertSchema(businessAddons).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBusinessTapBrandingSchema = createInsertSchema(businessTapBranding).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDonationCampaignSchema = createInsertSchema(donationCampaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertGroupCampaignSchema = createInsertSchema(groupCampaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertGroupCampaignMemberSchema = createInsertSchema(groupCampaignMembers).omit({
  id: true,
  joinedAt: true,
});

export const insertGroupCampaignProgressSchema = createInsertSchema(groupCampaignProgress).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCampaignSchema = createInsertSchema(campaigns).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  currentRedemptions: true,
});

export const insertNfcTagSchema = createInsertSchema(nfcTags).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  totalTaps: true,
  lastTapAt: true,
});

export const insertTapSchema = createInsertSchema(taps).omit({ 
  id: true, 
  createdAt: true 
});

export const insertRewardSchema = createInsertSchema(rewards).omit({ 
  id: true, 
  createdAt: true 
});

export const insertReferralSchema = createInsertSchema(referrals).omit({ 
  id: true, 
  createdAt: true,
  completedAt: true,
});

export const insertTapTrailSchema = createInsertSchema(tapTrails).omit({ 
  id: true, 
  createdAt: true 
});

export const insertUserTrailProgressSchema = createInsertSchema(userTrailProgress).omit({ 
  id: true, 
  createdAt: true,
  completedAt: true,
});

export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({ 
  id: true, 
  createdAt: true 
});

export const insertUserSubscriptionSchema = createInsertSchema(userSubscriptions).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true,
});

export const insertApiUsageSchema = createInsertSchema(apiUsage).omit({ 
  id: true, 
  createdAt: true 
});

// Types
export type User = typeof users.$inferSelect;

export type UpsertUser = typeof users.$inferInsert;

// Campaign Templates and Collaboration System
export const campaignTemplates = pgTable("campaign_templates", {
  id: varchar("id").primaryKey(),
  name: varchar("name").notNull(),
  category: varchar("category").notNull(),
  description: text("description").notNull(),
  businessTypes: text("business_types").array(),
  collaborationType: varchar("collaboration_type").notNull(), // 'solo', 'partner', 'network'
  rewards: jsonb("rewards").notNull(),
  duration: varchar("duration").notNull(),
  difficulty: varchar("difficulty").notNull(),
  estimatedROI: varchar("estimated_roi").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Admin Management Tables
// Admin action audit log — who did what, when. Written on privileged admin
// mutations (verify/reject, unpublish, revoke nonprofit, suspend, impersonate).
export const adminAudit = pgTable("admin_audit", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminUserId: varchar("admin_user_id").references(() => users.id),
  adminEmail: varchar("admin_email"),
  action: varchar("action").notNull(),
  targetType: varchar("target_type"),
  targetId: varchar("target_id"),
  detail: text("detail"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const adminUsers = pgTable("admin_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  adminLevel: varchar("admin_level").notNull(), // 'master', 'platform', 'support'
  permissions: jsonb("permissions").notNull(), // Array of permission strings
  // Invitation System
  invitedBy: varchar("invited_by").references(() => users.id),
  inviteToken: varchar("invite_token").unique(),
  inviteExpiresAt: timestamp("invite_expires_at"),
  inviteAcceptedAt: timestamp("invite_accepted_at"),
  invitationEmail: varchar("invitation_email"),
  // Training and Certification System
  trainingStatus: varchar("training_status").default("pending"), // pending, in_progress, completed, failed
  trainingCompletedAt: timestamp("training_completed_at"),
  certificationLevel: varchar("certification_level").default("basic"), // basic, intermediate, advanced, expert
  knowledgeChecklistProgress: jsonb("knowledge_checklist_progress").default(sql`'{}'`),
  practicalTestScore: integer("practical_test_score"), // 0-100
  // Communication Preferences
  communicationPreferences: jsonb("communication_preferences").default(sql`'{
    "email_notifications": true,
    "system_alerts": true,
    "training_updates": true,
    "platform_announcements": true
  }'`),
  specializations: text("specializations").array().default(sql`'{}'`), // user_management, campaign_oversight, technical_support
  emergencyContact: jsonb("emergency_contact").default(sql`'{}'`),
  createdAt: timestamp("created_at").defaultNow(),
  lastLoginAt: timestamp("last_login_at"),
  lastActiveAt: timestamp("last_active_at"),
  isActive: boolean("is_active").default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Admin Training Modules table
export const adminTrainingModules = pgTable("admin_training_modules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description"),
  moduleType: varchar("module_type").notNull(), // knowledge, practical, assessment
  category: varchar("category").notNull(), // platform_overview, user_management, campaign_management, technical_support
  requiredLevel: varchar("required_level").default("basic"), // basic, intermediate, advanced, expert
  content: jsonb("content").notNull(), // lesson content, questions, practical tasks
  passingScore: integer("passing_score").default(80), // minimum score to pass
  timeEstimate: integer("time_estimate"), // estimated completion time in minutes
  prerequisites: text("prerequisites").array().default(sql`'{}'`), // required module IDs
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Admin Training Progress table
export const adminTrainingProgress = pgTable("admin_training_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminUserId: varchar("admin_user_id").references(() => adminUsers.id).notNull(),
  moduleId: varchar("module_id").references(() => adminTrainingModules.id).notNull(),
  status: varchar("status").default("not_started"), // not_started, in_progress, completed, failed
  score: integer("score"), // for assessments
  timeSpent: integer("time_spent"), // minutes
  completedAt: timestamp("completed_at"),
  attempts: integer("attempts").default(0),
  lastAttemptAt: timestamp("last_attempt_at"),
  answers: jsonb("answers"), // for assessments and practical tests
  feedback: text("feedback"), // instructor or system feedback
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Admin Communications table
export const adminCommunications = pgTable("admin_communications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id").references(() => adminUsers.id),
  recipientId: varchar("recipient_id").references(() => adminUsers.id),
  recipientRole: varchar("recipient_role"), // for broadcasting to all admins of specific role
  recipientLevel: varchar("recipient_level"), // for broadcasting to specific certification levels
  type: varchar("type").notNull(), // announcement, training_update, system_alert, personal_message, emergency
  priority: varchar("priority").default("normal"), // low, normal, high, urgent, emergency
  subject: varchar("subject").notNull(),
  content: text("content").notNull(),
  metadata: jsonb("metadata").default(sql`'{}'`), // attachments, links, action buttons
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),
  requiresAcknowledgment: boolean("requires_acknowledgment").default(false),
  acknowledgedAt: timestamp("acknowledged_at"),
  actionRequired: varchar("action_required"), // complete_training, update_settings, review_policy
  actionCompletedAt: timestamp("action_completed_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Admin Knowledge Checklist Items
export const adminKnowledgeItems = pgTable("admin_knowledge_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  category: varchar("category").notNull(), // platform_overview, user_management, campaign_oversight, etc.
  subcategory: varchar("subcategory"),
  title: varchar("title").notNull(),
  description: text("description"),
  importance: varchar("importance").default("medium"), // low, medium, high, critical
  requiredFor: text("required_for").array().default(sql`'{}'`), // certification levels that require this
  verificationMethod: varchar("verification_method"), // quiz, practical, observation
  resourceLinks: jsonb("resource_links").default(sql`'{}'`),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const platformSettings = pgTable("platform_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key").notNull().unique(),
  value: jsonb("value").notNull(),
  category: varchar("category").notNull(), // 'system', 'billing', 'features'
  description: text("description"),
  updatedBy: varchar("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminId: varchar("admin_id").references(() => users.id).notNull(),
  action: varchar("action").notNull(), // 'create', 'update', 'delete', 'suspend'
  targetType: varchar("target_type").notNull(), // 'user', 'business', 'campaign', 'payment'
  targetId: varchar("target_id").notNull(),
  changes: jsonb("changes"), // Before/after data
  reason: text("reason"),
  ipAddress: varchar("ip_address"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type CampaignTemplate = typeof campaignTemplates.$inferSelect;
export type AdminUser = typeof adminUsers.$inferSelect;
export type PlatformSetting = typeof platformSettings.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Business = typeof businesses.$inferSelect;
export type InsertBusiness = z.infer<typeof insertBusinessSchema>;
export type Coordinator = typeof coordinators.$inferSelect;
export type InsertCoordinator = z.infer<typeof insertCoordinatorSchema>;
export type Territory = typeof territories.$inferSelect;
export type InsertTerritory = z.infer<typeof insertTerritorySchema>;
export type RegionalOffer = typeof regionalOffers.$inferSelect;
export type InsertRegionalOffer = z.infer<typeof insertRegionalOfferSchema>;
export type CoordinatorEarning = typeof coordinatorEarnings.$inferSelect;
export type InsertCoordinatorEarning = z.infer<typeof insertCoordinatorEarningSchema>;
export type CoordinatorPayout = typeof coordinatorPayouts.$inferSelect;
export type InsertCoordinatorPayout = z.infer<typeof insertCoordinatorPayoutSchema>;
export type BusinessAddon = typeof businessAddons.$inferSelect;
export type InsertBusinessAddon = z.infer<typeof insertBusinessAddonSchema>;
export type BusinessTapBranding = typeof businessTapBranding.$inferSelect;
export type InsertBusinessTapBranding = z.infer<typeof insertBusinessTapBrandingSchema>;
export type DonationCampaign = typeof donationCampaigns.$inferSelect;
export type InsertDonationCampaign = z.infer<typeof insertDonationCampaignSchema>;
export type Donation = typeof donations.$inferSelect;
export type GroupCampaign = typeof groupCampaigns.$inferSelect;
export type InsertGroupCampaign = z.infer<typeof insertGroupCampaignSchema>;
export type GroupCampaignMember = typeof groupCampaignMembers.$inferSelect;
export type InsertGroupCampaignMember = z.infer<typeof insertGroupCampaignMemberSchema>;
export type GroupCampaignProgress = typeof groupCampaignProgress.$inferSelect;
export type InsertGroupCampaignProgress = z.infer<typeof insertGroupCampaignProgressSchema>;

export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;

export type NfcTag = typeof nfcTags.$inferSelect;
export type InsertNfcTag = z.infer<typeof insertNfcTagSchema>;

export type Tap = typeof taps.$inferSelect;
export type InsertTap = z.infer<typeof insertTapSchema>;

export type Reward = typeof rewards.$inferSelect;
export type InsertReward = z.infer<typeof insertRewardSchema>;

export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = z.infer<typeof insertReferralSchema>;

export type TapTrail = typeof tapTrails.$inferSelect;
export type InsertTapTrail = z.infer<typeof insertTapTrailSchema>;

export type UserTrailProgress = typeof userTrailProgress.$inferSelect;
export type InsertUserTrailProgress = z.infer<typeof insertUserTrailProgressSchema>;

export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;

export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type InsertUserSubscription = z.infer<typeof insertUserSubscriptionSchema>;

export type ApiUsage = typeof apiUsage.$inferSelect;
export type InsertApiUsage = z.infer<typeof insertApiUsageSchema>;

// AI-POWERED FEATURES

// Customer Health Scoring & Predictive Analytics
export const customerHealthScores = pgTable("customer_health_scores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  businessId: varchar("business_id").references(() => businesses.id).notNull(),
  healthScore: real("health_score").notNull(), // 0-100 prediction score
  churnRisk: varchar("churn_risk").notNull(), // low, medium, high, critical
  visitPrediction: integer("visit_prediction"), // days until next predicted visit
  spendingPrediction: decimal("spending_prediction", { precision: 10, scale: 2 }),
  riskFactors: jsonb("risk_factors"), // reasons for churn risk
  retentionStrategies: jsonb("retention_strategies"), // AI recommended actions
  lastCalculated: timestamp("last_calculated").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Automated Win-Back Campaigns
export const winBackCampaigns = pgTable("winback_campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  businessId: varchar("business_id").references(() => businesses.id).notNull(),
  campaignType: varchar("campaign_type").notNull(), // email, sms, push, in_app
  triggerReason: varchar("trigger_reason").notNull(), // high_churn_risk, long_absence, competitor_visit
  offerType: varchar("offer_type").notNull(), // discount, free_item, points_bonus, exclusive_access
  offerValue: decimal("offer_value", { precision: 10, scale: 2 }),
  personalizedMessage: text("personalized_message"),
  sentAt: timestamp("sent_at"),
  openedAt: timestamp("opened_at"),
  clickedAt: timestamp("clicked_at"),
  redeemedAt: timestamp("redeemed_at"),
  isSuccess: boolean("is_success").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// COMMUNITY & SOCIAL FEATURES

// Teams
export const teams = pgTable("teams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  leaderId: varchar("leader_id").references(() => users.id).notNull(),
  maxMembers: integer("max_members").default(10),
  currentMembers: integer("current_members").default(1),
  teamType: varchar("team_type").default("casual"), // casual, competitive, corporate, family
  totalPoints: integer("total_points").default(0),
  totalChallengesCompleted: integer("total_challenges_completed").default(0),
  teamLevel: integer("team_level").default(1),
  teamBadges: text("team_badges").array().default(sql`'{}'`),
  isPublic: boolean("is_public").default(true),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Team Memberships
export const teamMemberships = pgTable("team_memberships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").references(() => teams.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  role: varchar("role").default("member"), // leader, co_leader, member, scout
  joinedAt: timestamp("joined_at").defaultNow(),
  pointsContributed: integer("points_contributed").default(0),
  isActive: boolean("is_active").default(true),
}, (table) => ({
  uniqueTeamUser: unique("team_memberships_team_user_unique").on(table.teamId, table.userId)
}));

// Community Challenges
export const communityChallenges = pgTable("community_challenges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description"),
  challengeType: varchar("challenge_type").notNull(), // individual, team, community, city_wide
  category: varchar("category"), // exploration, social, spending, referral, seasonal
  difficultyLevel: varchar("difficulty_level").default("medium"), // easy, medium, hard, epic
  requirements: jsonb("requirements"), // array of conditions to complete
  rewards: jsonb("rewards"), // points, badges, prizes, business discounts
  participantCount: integer("participant_count").default(0),
  completionCount: integer("completion_count").default(0),
  maxParticipants: integer("max_participants"),
  sponsorBusinessId: varchar("sponsor_business_id").references(() => businesses.id),
  isGlobal: boolean("is_global").default(false), // city-wide vs local
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// User Challenge Progress
export const userChallengeProgress = pgTable("user_challenge_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  challengeId: varchar("challenge_id").references(() => communityChallenges.id).notNull(),
  teamId: varchar("team_id").references(() => teams.id), // if team challenge
  progress: jsonb("progress"), // dynamic tracking of completion steps
  currentStep: integer("current_step").default(0),
  totalSteps: integer("total_steps"),
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
  pointsEarned: integer("points_earned").default(0),
  badgesEarned: text("badges_earned").array().default(sql`'{}'`),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueUserChallenge: unique("user_challenge_progress_user_challenge_unique").on(table.userId, table.challengeId)
}));


// HYPERLOCAL AI ANALYTICS

// Local Market Intelligence
export const localMarketData = pgTable("local_market_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").references(() => businesses.id).notNull(),
  dataType: varchar("data_type").notNull(), // weather_impact, traffic_patterns, event_correlation, competitor_analysis
  date: timestamp("date").notNull(),
  dataPoints: jsonb("data_points"), // flexible data structure
  insights: text("insights"), // AI-generated insights
  recommendations: jsonb("recommendations"), // AI suggested actions
  confidenceScore: real("confidence_score"), // 0-1 AI confidence level
  isActionable: boolean("is_actionable").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Predictive Pricing
export const predictivePricing = pgTable("predictive_pricing", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").references(() => businesses.id).notNull(),
  itemCategory: varchar("item_category").notNull(),
  currentPrice: decimal("current_price", { precision: 10, scale: 2 }),
  suggestedPrice: decimal("suggested_price", { precision: 10, scale: 2 }),
  priceChangeReason: text("price_change_reason"),
  expectedDemandChange: real("expected_demand_change"), // percentage
  expectedRevenueImpact: decimal("expected_revenue_impact", { precision: 10, scale: 2 }),
  marketFactors: jsonb("market_factors"), // weather, events, competition, seasonality
  validFrom: timestamp("valid_from"),
  validUntil: timestamp("valid_until"),
  isApplied: boolean("is_applied").default(false),
  appliedAt: timestamp("applied_at"),
  actualImpact: decimal("actual_impact", { precision: 10, scale: 2 }), // real result vs prediction
  createdAt: timestamp("created_at").defaultNow(),
});

// VIRAL GROWTH & SOCIAL FEATURES

// Social Proof Events
export const socialProofEvents = pgTable("social_proof_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  businessId: varchar("business_id").references(() => businesses.id).notNull(),
  eventType: varchar("event_type").notNull(), // visit, review, share, recommend, check_in
  visibility: varchar("visibility").default("friends"), // public, friends, private
  message: text("message"),
  metadata: jsonb("metadata"), // additional context like rating, photos
  viewCount: integer("view_count").default(0),
  interactionCount: integer("interaction_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Friend Networks
export const friendConnections = pgTable("friend_connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userAId: varchar("user_a_id").references(() => users.id).notNull(),
  userBId: varchar("user_b_id").references(() => users.id).notNull(),
  status: varchar("status").default("pending"), // pending, accepted, blocked
  connectionSource: varchar("connection_source"), // app_invite, phone_contact, social_media, mutual_friend
  connectedAt: timestamp("connected_at"),
  sharedVisits: integer("shared_visits").default(0), // businesses visited together
  mutualRewards: integer("mutual_rewards").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueFriendship: unique("friend_connections_user_pair_unique").on(table.userAId, table.userBId)
}));

// Viral Campaigns
export const viralCampaigns = pgTable("viral_campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").references(() => businesses.id).notNull(),
  title: varchar("title").notNull(),
  description: text("description"),
  campaignType: varchar("campaign_type").notNull(), // friend_referral, social_share, group_visit, challenge_completion
  viralMechanic: varchar("viral_mechanic").notNull(), // exponential_rewards, friend_multipliers, group_discounts, fomo_triggers
  baseReward: decimal("base_reward", { precision: 10, scale: 2 }),
  viralMultiplier: real("viral_multiplier").default(1.5), // reward multiplication factor
  maxReward: decimal("max_reward", { precision: 10, scale: 2 }),
  participantCount: integer("participant_count").default(0),
  shareCount: integer("share_count").default(0),
  conversionRate: real("conversion_rate").default(0),
  totalRevenue: decimal("total_revenue", { precision: 10, scale: 2 }).default(sql`0`),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Weather-Based Marketing
export const weatherTriggers = pgTable("weather_triggers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").references(() => businesses.id).notNull(),
  weatherCondition: varchar("weather_condition").notNull(), // sunny, rainy, cold, hot, snowy
  triggerType: varchar("trigger_type").notNull(), // temperature_above, temperature_below, precipitation, wind_speed
  thresholdValue: real("threshold_value"), // temperature or other numeric threshold
  campaignId: varchar("campaign_id").references(() => campaigns.id),
  customMessage: text("custom_message"),
  discountPercentage: real("discount_percentage"),
  isActive: boolean("is_active").default(true),
  lastTriggered: timestamp("last_triggered"),
  triggerCount: integer("trigger_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Local Events Integration
export const localEvents = pgTable("local_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description"),
  eventType: varchar("event_type").notNull(), // festival, sports, concert, community, seasonal
  location: varchar("location").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  attendeeCount: integer("attendee_count"),
  businessImpact: real("business_impact"), // predicted foot traffic increase %
  isVerified: boolean("is_verified").default(false),
  source: varchar("source"), // eventbrite, facebook, city_calendar, manual
  externalId: varchar("external_id"), // ID from external source
  createdAt: timestamp("created_at").defaultNow(),
});

// Event-Business Campaigns
export const eventBusinessCampaigns = pgTable("event_business_campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").references(() => localEvents.id).notNull(),
  businessId: varchar("business_id").references(() => businesses.id).notNull(),
  campaignId: varchar("campaign_id").references(() => campaigns.id),
  specialOffer: text("special_offer"),
  targetAudience: varchar("target_audience"), // event_attendees, local_residents, all
  radius: real("radius"), // kilometers from event location
  isActive: boolean("is_active").default(true),
  impressions: integer("impressions").default(0),
  clicks: integer("clicks").default(0),
  conversions: integer("conversions").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// New Advanced Feature Types
export type CustomerHealthScore = typeof customerHealthScores.$inferSelect;
export type WinBackCampaign = typeof winBackCampaigns.$inferSelect;
export type Team = typeof teams.$inferSelect;
export type TeamMembership = typeof teamMemberships.$inferSelect;
export type CommunityChallenge = typeof communityChallenges.$inferSelect;
export type UserChallengeProgress = typeof userChallengeProgress.$inferSelect;
export type LocalMarketData = typeof localMarketData.$inferSelect;
export type PredictivePricing = typeof predictivePricing.$inferSelect;
export type SocialProofEvent = typeof socialProofEvents.$inferSelect;
export type FriendConnection = typeof friendConnections.$inferSelect;
export type ViralCampaign = typeof viralCampaigns.$inferSelect;
export type WeatherTrigger = typeof weatherTriggers.$inferSelect;
export type LocalEvent = typeof localEvents.$inferSelect;
export type EventBusinessCampaign = typeof eventBusinessCampaigns.$inferSelect;

// Business Pairing & Recommendation System
export const businessPairingScores = pgTable("business_pairing_scores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessAId: varchar("business_a_id").references(() => businesses.id).notNull(),
  businessBId: varchar("business_b_id").references(() => businesses.id).notNull(),
  compatibilityScore: real("compatibility_score").notNull(), // 0-100 overall compatibility
  customerOverlapScore: real("customer_overlap_score").notNull(), // shared customer base
  geographicScore: real("geographic_score").notNull(), // location proximity benefit
  complementaryScore: real("complementary_score").notNull(), // business type synergy
  trafficPatternScore: real("traffic_pattern_score").notNull(), // timing compatibility
  costEfficiencyScore: real("cost_efficiency_score").notNull(), // reward cost optimization
  historicalSuccessScore: real("historical_success_score"), // past campaign performance
  seasonalCompatibility: jsonb("seasonal_compatibility"), // month-by-month scores
  sharedCustomerCount: integer("shared_customer_count").default(0),
  averageDistanceBetween: real("average_distance_between"), // kilometers
  lastCalculated: timestamp("last_calculated").defaultNow(),
  isRecommended: boolean("is_recommended").default(false),
});

export const businessRecommendations = pgTable("business_recommendations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  forBusinessId: varchar("for_business_id").references(() => businesses.id).notNull(),
  recommendedBusinessId: varchar("recommended_business_id").references(() => businesses.id).notNull(),
  recommendationType: varchar("recommendation_type").notNull(), // campaign_partner, cross_promotion, pool_participant, referral_partner
  confidenceScore: real("confidence_score").notNull(), // 0-100 AI confidence
  expectedBenefit: varchar("expected_benefit").notNull(), // increased_traffic, cost_savings, customer_acquisition, revenue_boost
  estimatedTrafficIncrease: real("estimated_traffic_increase"), // percentage
  estimatedCostSavings: decimal("estimated_cost_savings", { precision: 10, scale: 2 }),
  estimatedRevenueBoost: decimal("estimated_revenue_boost", { precision: 10, scale: 2 }),
  recommendationReason: text("recommendation_reason"),
  campaignSuggestions: jsonb("campaign_suggestions"), // specific campaign ideas
  optimalCampaignTiming: jsonb("optimal_campaign_timing"), // best months/days/times
  suggestedContributionSplit: jsonb("suggested_contribution_split"), // cost-sharing recommendation
  targetCustomerSegment: varchar("target_customer_segment"),
  isViewed: boolean("is_viewed").default(false),
  isAccepted: boolean("is_accepted").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"), // recommendations have expiry
});

export const customerJourneyMaps = pgTable("customer_journey_maps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").references(() => users.id).notNull(),
  visitSequence: jsonb("visit_sequence").notNull(), // ordered list of business visits
  totalJourneyValue: decimal("total_journey_value", { precision: 10, scale: 2 }),
  journeyDuration: integer("journey_duration"), // minutes between first and last visit
  journeyDate: timestamp("journey_date").notNull(),
  businessesVisited: integer("businesses_visited"),
  avgTimePerBusiness: real("avg_time_per_business"), // minutes
  totalDistanceTraveled: real("total_distance_traveled"), // kilometers
  journeyEfficiency: real("journey_efficiency"), // value per minute
  identifiedPatterns: jsonb("identified_patterns"), // AI-detected patterns
  crossSellingOpportunities: jsonb("cross_selling_opportunities"), // missed opportunities
  createdAt: timestamp("created_at").defaultNow(),
});

export const trafficPatternAnalysis = pgTable("traffic_pattern_analysis", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").references(() => businesses.id).notNull(),
  dayOfWeek: integer("day_of_week").notNull(), // 0=Sunday, 6=Saturday
  hourOfDay: integer("hour_of_day").notNull(), // 0-23
  month: integer("month").notNull(), // 1-12
  avgCustomerCount: real("avg_customer_count"),
  avgSpendPerCustomer: decimal("avg_spend_per_customer", { precision: 10, scale: 2 }),
  peakTrafficScore: real("peak_traffic_score"), // 0-100 relative to other times
  customerDemographics: jsonb("customer_demographics"), // age, interests during this time
  seasonalMultiplier: real("seasonal_multiplier"), // adjustment for time of year
  weatherCorrelation: real("weather_correlation"), // -1 to 1 weather impact
  eventCorrelation: real("event_correlation"), // local events impact
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const campaignSuccessFactors = pgTable("campaign_success_factors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").references(() => campaigns.id).notNull(),
  businessCombination: jsonb("business_combination").notNull(), // participating business types
  campaignType: varchar("campaign_type").notNull(),
  successScore: real("success_score").notNull(), // 0-100 overall success
  customerAcquisitionRate: real("customer_acquisition_rate"),
  customerRetentionRate: real("customer_retention_rate"),
  crossBusinessVisitRate: real("cross_business_visit_rate"), // % who visited partner businesses
  avgCustomerLifetimeValue: decimal("avg_customer_lifetime_value", { precision: 10, scale: 2 }),
  costPerAcquisition: decimal("cost_per_acquisition", { precision: 10, scale: 2 }),
  roiMultiplier: real("roi_multiplier"),
  keySuccessFactors: jsonb("key_success_factors"), // what made it successful
  failurePoints: jsonb("failure_points"), // what didn't work
  optimalTiming: jsonb("optimal_timing"), // best timing factors identified
  customerFeedbackScore: real("customer_feedback_score"), // 1-5 rating
  merchantSatisfactionScore: real("merchant_satisfaction_score"), // 1-5 rating
  createdAt: timestamp("created_at").defaultNow(),
});

// Business Pairing System Types
export const insertBusinessPairingScoreSchema = createInsertSchema(businessPairingScores);
export const insertBusinessRecommendationSchema = createInsertSchema(businessRecommendations);
export const insertCustomerJourneyMapSchema = createInsertSchema(customerJourneyMaps);
export const insertTrafficPatternAnalysisSchema = createInsertSchema(trafficPatternAnalysis);
export const insertCampaignSuccessFactorSchema = createInsertSchema(campaignSuccessFactors);

export type BusinessPairingScore = typeof businessPairingScores.$inferSelect;
export type BusinessRecommendation = typeof businessRecommendations.$inferSelect;
export type CustomerJourneyMap = typeof customerJourneyMaps.$inferSelect;
export type TrafficPatternAnalysis = typeof trafficPatternAnalysis.$inferSelect;
export type CampaignSuccessFactor = typeof campaignSuccessFactors.$inferSelect;

export type InsertBusinessPairingScore = z.infer<typeof insertBusinessPairingScoreSchema>;
export type InsertBusinessRecommendation = z.infer<typeof insertBusinessRecommendationSchema>;
export type InsertCustomerJourneyMap = z.infer<typeof insertCustomerJourneyMapSchema>;
export type InsertTrafficPatternAnalysis = z.infer<typeof insertTrafficPatternAnalysisSchema>;
export type InsertCampaignSuccessFactor = z.infer<typeof insertCampaignSuccessFactorSchema>;

// REAL SALES DATA INPUT SYSTEM

// Real Sales Data Input System
export const salesData = pgTable("sales_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businesses.id),
  date: varchar("date").notNull(), // Using varchar for date to avoid import issues
  totalSales: varchar("total_sales").notNull(), // Changed to varchar to match database
  cirqlDrivenSales: varchar("cirql_driven_sales").default("0"),
  customerCount: integer("customer_count").default(0),
  newCustomers: integer("new_customers").default(0),
  returningCustomers: integer("returning_customers").default(0),
  averageTicket: varchar("average_ticket").default("0.00"),
  notes: text("notes"),
  inputMethod: varchar("input_method").default("manual"), // manual, pos_integration, csv_upload
  verificationStatus: varchar("verification_status").default("unverified"), // unverified, verified, disputed
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Monthly Sales Summaries
export const monthlySalesSummary = pgTable("monthly_sales_summary", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businesses.id),
  month: integer("month").notNull(), // 1-12
  year: integer("year").notNull(),
  totalSales: decimal("total_sales", { precision: 10, scale: 2 }).notNull(),
  cirqlDrivenSales: decimal("cirql_driven_sales", { precision: 10, scale: 2 }).default("0.00"),
  cirqlROI: decimal("cirql_roi", { precision: 5, scale: 2 }).default("0.00"), // Return on Investment percentage
  totalCustomers: integer("total_customers").default(0),
  newCustomersFromCirql: integer("new_customers_from_cirql").default(0),
  retentionRate: decimal("retention_rate", { precision: 5, scale: 2 }).default("0.00"),
  averageTicketGrowth: decimal("average_ticket_growth", { precision: 5, scale: 2 }).default("0.00"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Business Performance Goals
export const businessGoals = pgTable("business_goals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businesses.id),
  goalType: varchar("goal_type").notNull(), // revenue, customers, retention, avg_ticket
  targetValue: decimal("target_value", { precision: 10, scale: 2 }).notNull(),
  currentValue: decimal("current_value", { precision: 10, scale: 2 }).default("0.00"),
  timeframe: varchar("timeframe").notNull(), // monthly, quarterly, yearly
  startDate: varchar("start_date").notNull(),
  endDate: varchar("end_date").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Sales Data Insert Schemas
export const insertSalesDataSchema = createInsertSchema(salesData);
export const insertMonthlySalesSummarySchema = createInsertSchema(monthlySalesSummary);
export const insertBusinessGoalsSchema = createInsertSchema(businessGoals);

// Sales Data Types
export type SalesData = typeof salesData.$inferSelect;
export type MonthlySalesSummary = typeof monthlySalesSummary.$inferSelect;
export type BusinessGoals = typeof businessGoals.$inferSelect;

export type InsertSalesData = z.infer<typeof insertSalesDataSchema>;
export type InsertMonthlySalesSummary = z.infer<typeof insertMonthlySalesSummarySchema>;
export type InsertBusinessGoals = z.infer<typeof insertBusinessGoalsSchema>;
// ── Cross-role messaging (Slice 1: Coordinator ↔ Business) ──
// A generic two-party thread engine shared by every role pairing. `contextType`
// is the seam that lets later slices (admin support, opted-in customer reply)
// reuse these same two tables without a schema change. Slice 1 only wires the
// coordinator↔business direction in the UI. In-app only for now — no email/push
// delivery yet (mirrors businessReminders). Delivery is a documented follow-up.
export const messageThreads = pgTable("message_threads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  subject: varchar("subject").notNull(),
  // coordinator_business | admin_support | customer_business
  contextType: varchar("context_type").notNull().default("coordinator_business"),
  coordinatorId: varchar("coordinator_id").references(() => coordinators.id),
  businessId: varchar("business_id").references(() => businesses.id),
  // The customer party for context_type='customer_business' (Slice 4). Null
  // otherwise. The customer always initiates; the business replies.
  customerUserId: varchar("customer_user_id").references(() => users.id),
  status: varchar("status").notNull().default("open"), // open | closed
  lastMessageAt: timestamp("last_message_at").defaultNow(),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  threadId: varchar("thread_id").references(() => messageThreads.id).notNull(),
  senderId: varchar("sender_id").references(() => users.id),
  senderRole: varchar("sender_role").notNull(), // coordinator | business | admin | customer
  body: text("body").notNull(),
  readAt: timestamp("read_at"), // null until the counterpart opens the thread
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMessageThreadSchema = createInsertSchema(messageThreads).omit({
  id: true,
  lastMessageAt: true,
  createdAt: true,
});
export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  readAt: true,
  createdAt: true,
});

export type MessageThread = typeof messageThreads.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type InsertMessageThread = z.infer<typeof insertMessageThreadSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

// ── Admin broadcasts (Slice 2) ──
// One-way platform announcements from an admin down to a role audience. No
// per-recipient row: the recipient's feed is a query over `audience`. Read
// state is a single per-user watermark (userBroadcastState) rather than a
// row-per-broadcast, which is cheap at platform scale.
export const broadcasts = pgTable("broadcasts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderUserId: varchar("sender_user_id").references(() => users.id),
  audience: varchar("audience").notNull(), // all | coordinators | businesses | customers
  subject: varchar("subject").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// A per-user watermark: broadcasts newer than lastSeenAt are "unread" for them.
export const userBroadcastState = pgTable("user_broadcast_state", {
  userId: varchar("user_id").primaryKey().references(() => users.id),
  lastSeenAt: timestamp("last_seen_at").defaultNow(),
});

export const insertBroadcastSchema = createInsertSchema(broadcasts).omit({
  id: true,
  createdAt: true,
});

export type Broadcast = typeof broadcasts.$inferSelect;
export type InsertBroadcast = z.infer<typeof insertBroadcastSchema>;
export type UserBroadcastState = typeof userBroadcastState.$inferSelect;

// ── Manual reward/balance adjustments (admin + coordinator ops tool) ──
// Every manual change to a customer's loyalty points or rewards is recorded here
// so "if something goes wrong" fixes are fully auditable. actorRole records
// whether an admin or a (territory-scoped) coordinator made the change.
export const rewardAdjustments = pgTable("reward_adjustments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  actorUserId: varchar("actor_user_id").references(() => users.id),
  actorRole: varchar("actor_role").notNull(), // admin | coordinator
  targetUserId: varchar("target_user_id").references(() => users.id),
  targetEmail: varchar("target_email"),
  businessId: varchar("business_id").references(() => businesses.id), // for reward grant/redeem
  kind: varchar("kind").notNull(), // points | grant | redeem | unredeem
  pointsDelta: integer("points_delta"), // for kind='points'
  rewardId: varchar("reward_id").references(() => rewards.id), // for grant/redeem/unredeem
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type RewardAdjustment = typeof rewardAdjustments.$inferSelect;

// ── Shared-campaign reward cost-splitting (fairness for multi-store rewards) ──
// When a FUNDED group-campaign reward is unlocked, its cost is split across the
// participating stores (tap-weighted): the host fronted the item, the other
// stores reimburse their share. `reward_contributions` is the accrual ledger
// (one row per driver store per unlocked reward, mirroring the `donations`
// pattern); `reward_settlements` rolls a host's owed contributions into a
// monthly statement with a mark-settled action (mirroring `coordinator_payouts`;
// automated Stripe Connect transfer is the same deferred follow-up).
export const rewardSettlements = pgTable("reward_settlements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hostBusinessId: varchar("host_business_id").references(() => businesses.id).notNull(), // payee
  periodMonth: varchar("period_month").notNull(), // YYYY-MM
  totalCents: integer("total_cents").notNull().default(0),
  contributionCount: integer("contribution_count").notNull().default(0),
  status: varchar("status").notNull().default("pending"), // pending | paid | void
  method: varchar("method").default("manual"), // manual | stripe_connect
  reference: varchar("reference"),
  stripeTransferId: varchar("stripe_transfer_id"), // set when settled via Connect payout
  notes: text("notes"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  paidAt: timestamp("paid_at"),
});

export const rewardContributions = pgTable("reward_contributions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupCampaignId: varchar("group_campaign_id").references(() => groupCampaigns.id).notNull(),
  rewardId: varchar("reward_id").references(() => rewards.id).notNull(),
  hostBusinessId: varchar("host_business_id").references(() => businesses.id).notNull(), // payee
  businessId: varchar("business_id").references(() => businesses.id).notNull(), // payer (driver store)
  customerEmail: varchar("customer_email"),
  weightTaps: integer("weight_taps").default(0), // taps by this customer at this store (weight)
  totalRewardCents: integer("total_reward_cents").notNull().default(0), // snapshot of reward value
  shareCents: integer("share_cents").notNull().default(0), // this store's owed share
  basis: varchar("basis").notNull().default("weighted"), // weighted | equal
  periodMonth: varchar("period_month").notNull(), // YYYY-MM
  settlementId: varchar("settlement_id").references(() => rewardSettlements.id), // set once rolled up
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniquePerReward: unique("reward_contributions_reward_business_unique").on(table.rewardId, table.businessId),
}));

export type RewardContribution = typeof rewardContributions.$inferSelect;
export type RewardSettlement = typeof rewardSettlements.$inferSelect;

// ── Badges (recognition/gamification) ──
// A badge catalog (prepopulated + user-created custom) and an award ledger.
// Phase 1 is MANUAL awarding across four directions; automatic achievement
// badges (tap/visit/campaign thresholds) come later. Uploaded art is stored as
// a capped base64 data-URI (no blob store yet) — otherwise an emoji medallion.
export const badgeDefinitions = pgTable("badge_definitions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key").notNull().unique(), // stable slug ('great_service', or custom_<uuid>)
  name: varchar("name").notNull(),
  description: text("description"),
  emoji: varchar("emoji"),               // quick visual / fallback when no image
  imageDataUri: text("image_data_uri"),  // uploaded PNG/JPG/WebP as data URI (capped)
  color: varchar("color").default("#7c3aed"), // medallion ring color
  // Who the badge is FOR (drives recipient type): business = a business,
  // customer/coordinator/any = a user.
  audience: varchar("audience").notNull().default("any"),
  // Who may grant it: system | business | customer | coordinator | admin.
  awardableBy: varchar("awardable_by").notNull().default("admin"),
  tier: varchar("tier"),                 // bronze|silver|gold|platinum
  // Auto-award rule for achievement badges (awardableBy='system'):
  // { metric: 'taps'|'distinct_businesses'|'streak'|'biz_taps'|'biz_customers', threshold: N }
  criteria: jsonb("criteria"),
  isCustom: boolean("is_custom").default(false),
  createdByUserId: varchar("created_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const badgeAwards = pgTable("badge_awards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  badgeDefinitionId: varchar("badge_definition_id").references(() => badgeDefinitions.id).notNull(),
  // Exactly one recipient is set.
  recipientUserId: varchar("recipient_user_id").references(() => users.id),
  recipientBusinessId: varchar("recipient_business_id").references(() => businesses.id),
  note: text("note"),
  awarderRole: varchar("awarder_role").notNull(), // system|business|customer|coordinator|admin
  awarderUserId: varchar("awarder_user_id").references(() => users.id),
  awarderBusinessId: varchar("awarder_business_id").references(() => businesses.id),
  awardedAt: timestamp("awarded_at").defaultNow(),
  revokedAt: timestamp("revoked_at"),
});

export type BadgeDefinition = typeof badgeDefinitions.$inferSelect;
export type BadgeAward = typeof badgeAwards.$inferSelect;

// ── Points economy (redemption) ──
// Gives loyalty points a real sink: customers spend availablePoints on perks a
// business funds (redeemable in-store), platform perks, or prize-draw entries.
export const pointRewards = pgTable("point_rewards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description"),
  emoji: varchar("emoji"),
  pointsCost: integer("points_cost").notNull(),
  type: varchar("type").notNull().default("business_perk"), // business_perk | platform_perk | prize_draw
  businessId: varchar("business_id").references(() => businesses.id), // funded/redeemed at this business
  createdByUserId: varchar("created_by_user_id").references(() => users.id),
  createdByRole: varchar("created_by_role").notNull().default("business"), // business | coordinator | admin
  quantity: integer("quantity"), // null = unlimited
  redeemedCount: integer("redeemed_count").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  endsAt: timestamp("ends_at"),      // optional expiry
  drawAt: timestamp("draw_at"),      // for prize_draw
  winnerRedemptionId: varchar("winner_redemption_id"), // set when a draw is run
  createdAt: timestamp("created_at").defaultNow(),
});

export const pointRedemptions = pgTable("point_redemptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pointRewardId: varchar("point_reward_id").references(() => pointRewards.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  pointsSpent: integer("points_spent").notNull(),
  rewardId: varchar("reward_id").references(() => rewards.id), // for perks → an in-store reward
  code: varchar("code"),             // redemption code (platform perks)
  status: varchar("status").notNull().default("active"), // active | redeemed | entered | won | lost
  createdAt: timestamp("created_at").defaultNow(),
});

export type PointReward = typeof pointRewards.$inferSelect;
export type PointRedemption = typeof pointRedemptions.$inferSelect;

// ── Collections / passports ──
// A curated set of businesses ("visit all N coffee shops → Coffee Passport").
// Completing it (visiting every member) grants bonus points. Admin/coordinator
// curated. Advances on tap, like group campaigns but discovery-themed.
export const collections = pgTable("collections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  emoji: varchar("emoji"),
  color: varchar("color").default("#7c3aed"),
  rewardPoints: integer("reward_points").notNull().default(100),
  createdByUserId: varchar("created_by_user_id").references(() => users.id),
  createdByRole: varchar("created_by_role").notNull().default("admin"), // admin | coordinator
  territoryId: varchar("territory_id").references(() => territories.id),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const collectionItems = pgTable("collection_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  collectionId: varchar("collection_id").references(() => collections.id).notNull(),
  businessId: varchar("business_id").references(() => businesses.id).notNull(),
}, (table) => ({
  uniqueItem: unique("collection_items_unique").on(table.collectionId, table.businessId),
}));

export const collectionProgress = pgTable("collection_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  collectionId: varchar("collection_id").references(() => collections.id).notNull(),
  userId: varchar("user_id").references(() => users.id),
  customerEmail: varchar("customer_email"),
  deviceFingerprint: varchar("device_fingerprint"),
  visitedBusinessIds: jsonb("visited_business_ids").default(sql`'[]'`),
  completedAt: timestamp("completed_at"),
  rewardGranted: boolean("reward_granted").notNull().default(false),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Collection = typeof collections.$inferSelect;
export type CollectionProgress = typeof collectionProgress.$inferSelect;

// ── Seasonal events ──
// A time-boxed event (e.g. "First Fridays") that multiplies tap points while
// active. Admin-created; surfaced to customers as a limited-time banner.
export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  emoji: varchar("emoji"),
  pointMultiplier: integer("point_multiplier").notNull().default(2),
  startsAt: timestamp("starts_at").notNull(),
  endsAt: timestamp("ends_at").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdByUserId: varchar("created_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Event = typeof events.$inferSelect;

// CIRQL game progress (CHR-94) — one row per user; guests don't persist.
export const gameProgress = pgTable("game_progress", {
  userId: varchar("user_id").primaryKey().references(() => users.id),
  worldIndex: integer("world_index").notNull().default(0), // resume point (absolute world index)
  worldsRestored: integer("worlds_restored").notNull().default(0),
  playerSeed: integer("player_seed").notNull().default(0), // seeds the infinite procedural stream (unique per player)
  state: jsonb("state"), // extensible blob (per-world stars, cosmetics, XP, …)
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type GameProgress = typeof gameProgress.$inferSelect;
