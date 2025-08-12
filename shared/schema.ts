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
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").default("customer"), // customer, merchant, admin
  subscriptionTier: varchar("subscription_tier").default("starter"), // starter, professional, business, enterprise
  subscriptionStatus: varchar("subscription_status").default("active"), // active, cancelled, expired
  starterExpiresAt: timestamp("starter_expires_at"), // 6 months from signup for starter tier
  trialDiscountTier: varchar("trial_discount_tier"), // Selected tier during trial for 50% discount
  trialDiscountEndsAt: timestamp("trial_discount_ends_at"), // When 50% discount expires
  trialDiscountActive: boolean("trial_discount_active").default(false),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
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
  // AR Avatar & Gamification
  avatarId: varchar("avatar_id"),
  avatarLevel: integer("avatar_level").default(1),
  avatarExperience: integer("avatar_experience").default(0),
  avatarSkills: jsonb("avatar_skills").default(sql`'{}'`), // cooking, fitness, art, social, explorer
  avatarBadges: text("avatar_badges").array().default(sql`'{}'`),
  avatarInventory: jsonb("avatar_inventory").default(sql`'{}'`), // collected items, power-ups
  avatarAchievements: jsonb("avatar_achievements").default(sql`'{}'`),
  currentStreak: integer("current_streak").default(0),
  longestStreak: integer("longest_streak").default(0),
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
  phone: varchar("phone"),
  email: varchar("email"),
  website: varchar("website"),
  logo: varchar("logo"),
  ownerId: varchar("owner_id").references(() => users.id),
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

// Campaigns table
export const campaigns = pgTable("campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").references(() => businesses.id).notNull(),
  name: varchar("name").notNull(),
  description: text("description"),
  type: varchar("type").notNull(), // discount, loyalty, referral, trail
  value: decimal("value", { precision: 10, scale: 2 }),
  pointsAwarded: integer("points_awarded").default(0),
  maxRedemptions: integer("max_redemptions"),
  currentRedemptions: integer("current_redemptions").default(0),
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
  isActive: boolean("is_active").default(true),
  totalTaps: integer("total_taps").default(0),
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

// Avatar system tables
export const userAvatars = pgTable("user_avatars", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  name: varchar("name").default("My Avatar"),
  hair: varchar("hair").default("default_hair"),
  eyes: varchar("eyes").default("default_eyes"),
  skin: varchar("skin").default("default_skin"),
  outfit: varchar("outfit").default("default_outfit"),
  accessories: jsonb("accessories").default([]),
  pet: varchar("pet"),
  effects: jsonb("effects").default([]),
  level: integer("level").default(1),
  experience: integer("experience").default(0),
  coins: integer("coins").default(500),
  badges: jsonb("badges").default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const avatarAssets = pgTable("avatar_assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: varchar("type").notNull(), // 'hair', 'eyes', 'skin', 'outfit', 'accessory', 'pet', 'effect'
  name: varchar("name").notNull(),
  rarity: varchar("rarity").notNull().default("common"), // 'common', 'rare', 'epic', 'legendary'
  cost: integer("cost").default(0),
  unlockCondition: varchar("unlock_condition"),
  businessId: varchar("business_id").references(() => businesses.id),
  previewUrl: varchar("preview_url"),
  animationUrl: varchar("animation_url"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userAvatarAssets = pgTable("user_avatar_assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  assetId: varchar("asset_id").references(() => avatarAssets.id),
  purchasedAt: timestamp("purchased_at").defaultNow(),
});





export const avatarAchievements = pgTable("avatar_achievements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: varchar("description"),
  type: varchar("type").notNull(), // 'taps', 'visits', 'referrals', 'spending'
  target: integer("target").notNull(),
  reward: varchar("reward"), // description of reward
  rewardType: varchar("reward_type"), // 'coins', 'asset', 'badge'
  rewardValue: varchar("reward_value"),
  rarity: varchar("rarity").default("common"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userAvatarAchievements = pgTable("user_avatar_achievements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  achievementId: varchar("achievement_id").references(() => avatarAchievements.id),
  progress: integer("progress").default(0),
  completed: boolean("completed").default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Avatar interaction logs
export const avatarInteractions = pgTable("avatar_interactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  businessId: varchar("business_id").references(() => businesses.id),
  interactionType: varchar("interaction_type").notNull(), // 'ar_photo', 'tap_animation', 'social_share'
  metadata: jsonb("metadata").default({}),
  experienceGained: integer("experience_gained").default(0),
  coinsEarned: integer("coins_earned").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export type UserAvatar = typeof userAvatars.$inferSelect;
export type InsertUserAvatar = typeof userAvatars.$inferInsert;
export type AvatarAsset = typeof avatarAssets.$inferSelect;
export type InsertAvatarAsset = typeof avatarAssets.$inferInsert;
export type AvatarAchievement = typeof avatarAchievements.$inferSelect;
export type AvatarInteraction = typeof avatarInteractions.$inferSelect;
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

export const campaignPartners = pgTable("campaign_partners", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").references(() => campaigns.id).notNull(),
  businessId: varchar("business_id").notNull(),
  businessName: varchar("business_name").notNull(),
  businessCategory: varchar("business_category").notNull(),
  joinedAt: timestamp("joined_at").defaultNow(),
  status: varchar("status").default("active"), // 'active', 'pending', 'declined'
  contribution: jsonb("contribution"), // What this partner contributes
});

export const campaignParticipations = pgTable("campaign_participations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").references(() => campaigns.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  businessId: varchar("business_id"), // Which partner business they interacted with
  progress: jsonb("progress").notNull(), // Track completion status
  rewardsEarned: jsonb("rewards_earned").default(sql`'[]'::jsonb`),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Admin Management Tables
export const adminUsers = pgTable("admin_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  adminLevel: varchar("admin_level").notNull(), // 'master', 'platform', 'support'
  permissions: jsonb("permissions").notNull(), // Array of permission strings
  createdAt: timestamp("created_at").defaultNow(),
  lastLoginAt: timestamp("last_login_at"),
  isActive: boolean("is_active").default(true),
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
export type CampaignPartner = typeof campaignPartners.$inferSelect;
export type CampaignParticipation = typeof campaignParticipations.$inferSelect;
export type AdminUser = typeof adminUsers.$inferSelect;
export type PlatformSetting = typeof platformSettings.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Business = typeof businesses.$inferSelect;
export type InsertBusiness = z.infer<typeof insertBusinessSchema>;

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

// CROSS-BUSINESS PARTNERSHIPS

// Business Partnerships
export const businessPartnerships = pgTable("business_partnerships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessAId: varchar("business_a_id").references(() => businesses.id).notNull(),
  businessBId: varchar("business_b_id").references(() => businesses.id).notNull(),
  partnershipType: varchar("partnership_type").notNull(), // referral, joint_campaign, cross_promotion, shared_rewards
  status: varchar("status").default("pending"), // pending, active, paused, ended
  commissionRate: real("commission_rate"), // percentage for referrals
  sharedBudget: decimal("shared_budget", { precision: 10, scale: 2 }),
  totalReferrals: integer("total_referrals").default(0),
  totalRevenue: decimal("total_revenue", { precision: 10, scale: 2 }).default(sql`0`),
  terms: text("terms"), // partnership agreement details
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Cross-Business Rewards
export const crossBusinessRewards = pgTable("cross_business_rewards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  partnershipId: varchar("partnership_id").references(() => businessPartnerships.id).notNull(),
  triggerBusinessId: varchar("trigger_business_id").references(() => businesses.id).notNull(),
  rewardBusinessId: varchar("reward_business_id").references(() => businesses.id).notNull(),
  rewardType: varchar("reward_type").notNull(), // discount, free_item, points, cashback
  rewardValue: decimal("reward_value", { precision: 10, scale: 2 }),
  description: text("description"),
  conditions: text("conditions"), // e.g., "spend $50+ at partner business"
  isActive: boolean("is_active").default(true),
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
  uniqueTeamUser: primaryKey({ columns: [table.teamId, table.userId] })
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
  uniqueUserChallenge: primaryKey({ columns: [table.userId, table.challengeId] })
}));

// ADVANCED AR & GAMING

// AR Experiences
export const arExperiences = pgTable("ar_experiences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").references(() => businesses.id).notNull(),
  title: varchar("title").notNull(),
  description: text("description"),
  experienceType: varchar("experience_type").notNull(), // treasure_hunt, virtual_menu, game, showcase
  triggerType: varchar("trigger_type").default("nfc_tap"), // nfc_tap, location, qr_code, manual
  arAssetUrl: varchar("ar_asset_url"), // 3D model or experience URL
  rewardPoints: integer("reward_points").default(0),
  rewardItems: jsonb("reward_items"), // virtual items or real rewards
  playCount: integer("play_count").default(0),
  averageRating: real("average_rating"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// AR Treasure Hunts
export const arTreasureHunts = pgTable("ar_treasure_hunts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description"),
  huntType: varchar("hunt_type").default("city_wide"), // business_specific, neighborhood, city_wide
  clues: jsonb("clues"), // array of clue objects with locations and hints
  requiredBusinesses: jsonb("required_businesses"), // businesses that must be visited
  treasureLocations: jsonb("treasure_locations"), // GPS coordinates or business IDs
  finalReward: jsonb("final_reward"), // ultimate prize
  participantCount: integer("participant_count").default(0),
  completionCount: integer("completion_count").default(0),
  difficulty: varchar("difficulty").default("medium"),
  estimatedDuration: integer("estimated_duration"), // minutes
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// AR Hunt Progress
export const arHuntProgress = pgTable("ar_hunt_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  huntId: varchar("hunt_id").references(() => arTreasureHunts.id).notNull(),
  currentClue: integer("current_clue").default(0),
  cluesCompleted: jsonb("clues_completed"), // array of completed clue IDs
  treasuresFound: integer("treasures_found").default(0),
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
  totalTime: integer("total_time"), // minutes taken to complete
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueUserHunt: primaryKey({ columns: [table.userId, table.huntId] })
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
  uniqueFriendship: primaryKey({ columns: [table.userAId, table.userBId] })
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
export type BusinessPartnership = typeof businessPartnerships.$inferSelect;
export type CrossBusinessReward = typeof crossBusinessRewards.$inferSelect;
export type Team = typeof teams.$inferSelect;
export type TeamMembership = typeof teamMemberships.$inferSelect;
export type CommunityChallenge = typeof communityChallenges.$inferSelect;
export type UserChallengeProgress = typeof userChallengeProgress.$inferSelect;
export type ArExperience = typeof arExperiences.$inferSelect;
export type ArTreasureHunt = typeof arTreasureHunts.$inferSelect;
export type ArHuntProgress = typeof arHuntProgress.$inferSelect;
export type LocalMarketData = typeof localMarketData.$inferSelect;
export type PredictivePricing = typeof predictivePricing.$inferSelect;
export type SocialProofEvent = typeof socialProofEvents.$inferSelect;
export type FriendConnection = typeof friendConnections.$inferSelect;
export type ViralCampaign = typeof viralCampaigns.$inferSelect;
export type WeatherTrigger = typeof weatherTriggers.$inferSelect;
export type LocalEvent = typeof localEvents.$inferSelect;
export type EventBusinessCampaign = typeof eventBusinessCampaigns.$inferSelect;