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
  subscriptionTier: varchar("subscription_tier").default("free"), // free, basic, premium, enterprise
  subscriptionStatus: varchar("subscription_status").default("active"), // active, cancelled, expired
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  apiKey: varchar("api_key").unique(), // for API access to both Cirql and InSpektAI
  apiKeyCreatedAt: timestamp("api_key_created_at"),
  totalPoints: integer("total_points").default(0),
  availablePoints: integer("available_points").default(0),
  tier: varchar("tier").default("Bronze"), // Bronze, Silver, Gold, Platinum
  referralCode: varchar("referral_code").unique(),
  referredBy: varchar("referred_by"),
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