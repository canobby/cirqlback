import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, decimal, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table - for merchants and customers
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'merchant' | 'customer' | 'admin'
  businessName: text("business_name"), // for merchants
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

// Business/merchant profiles
export const businesses = pgTable("businesses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  address: text("address"),
  category: text("category"), // 'coffee', 'restaurant', 'retail', etc.
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

// Campaigns created by merchants
export const campaigns = pgTable("campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businesses.id),
  name: text("name").notNull(),
  description: text("description").notNull(),
  rewardType: text("reward_type").notNull(), // 'discount', 'points', 'freebie', 'punch_card'
  rewardValue: text("reward_value").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  maxRedemptions: integer("max_redemptions"),
  currentRedemptions: integer("current_redemptions").default(0).notNull(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

// NFC tags assigned to campaigns
export const nfcTags = pgTable("nfc_tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").notNull().references(() => campaigns.id),
  businessId: varchar("business_id").notNull().references(() => businesses.id),
  location: text("location"), // 'checkout counter', 'front door', etc.
  tagUrl: text("tag_url").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

// Tap events when customers interact with NFC tags
export const taps = pgTable("taps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tagId: varchar("tag_id").notNull().references(() => nfcTags.id),
  campaignId: varchar("campaign_id").notNull().references(() => campaigns.id),
  businessId: varchar("business_id").notNull().references(() => businesses.id),
  customerEmail: text("customer_email"), // optional for guest taps
  customerName: text("customer_name"), // optional
  deviceId: text("device_id"), // for fraud prevention
  ipAddress: text("ip_address"),
  location: jsonb("location"), // GPS coordinates if available
  tappedAt: timestamp("tapped_at").default(sql`now()`).notNull(),
});

// Customer rewards and loyalty tracking
export const customerRewards = pgTable("customer_rewards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerEmail: text("customer_email").notNull(),
  businessId: varchar("business_id").notNull().references(() => businesses.id),
  campaignId: varchar("campaign_id").notNull().references(() => campaigns.id),
  rewardType: text("reward_type").notNull(),
  rewardValue: text("reward_value").notNull(),
  isRedeemed: boolean("is_redeemed").default(false).notNull(),
  redeemedAt: timestamp("redeemed_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

// Tap trails for multi-business rewards
export const tapTrails = pgTable("tap_trails", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  requiredBusinessCount: integer("required_business_count").notNull(),
  rewardValue: text("reward_value").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

// Businesses participating in tap trails
export const tapTrailBusinesses = pgTable("tap_trail_businesses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  trailId: varchar("trail_id").notNull().references(() => tapTrails.id),
  businessId: varchar("business_id").notNull().references(() => businesses.id),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

// Customer progress on tap trails
export const customerTrailProgress = pgTable("customer_trail_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerEmail: text("customer_email").notNull(),
  trailId: varchar("trail_id").notNull().references(() => tapTrails.id),
  businessesVisited: jsonb("businesses_visited").notNull().default('[]'),
  isCompleted: boolean("is_completed").default(false).notNull(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

// Referrals
export const referrals = pgTable("referrals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referrerEmail: text("referrer_email").notNull(),
  refereeEmail: text("referee_email").notNull(),
  businessId: varchar("business_id").notNull().references(() => businesses.id),
  status: text("status").default('pending').notNull(), // 'pending', 'completed', 'rewarded'
  rewardValue: text("reward_value"),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  businesses: many(businesses),
}));

export const businessesRelations = relations(businesses, ({ one, many }) => ({
  user: one(users, { fields: [businesses.userId], references: [users.id] }),
  campaigns: many(campaigns),
  nfcTags: many(nfcTags),
  taps: many(taps),
  customerRewards: many(customerRewards),
  tapTrailBusinesses: many(tapTrailBusinesses),
  referrals: many(referrals),
}));

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  business: one(businesses, { fields: [campaigns.businessId], references: [businesses.id] }),
  nfcTags: many(nfcTags),
  taps: many(taps),
  customerRewards: many(customerRewards),
}));

export const nfcTagsRelations = relations(nfcTags, ({ one, many }) => ({
  campaign: one(campaigns, { fields: [nfcTags.campaignId], references: [campaigns.id] }),
  business: one(businesses, { fields: [nfcTags.businessId], references: [businesses.id] }),
  taps: many(taps),
}));

export const tapsRelations = relations(taps, ({ one }) => ({
  tag: one(nfcTags, { fields: [taps.tagId], references: [nfcTags.id] }),
  campaign: one(campaigns, { fields: [taps.campaignId], references: [campaigns.id] }),
  business: one(businesses, { fields: [taps.businessId], references: [businesses.id] }),
}));

export const customerRewardsRelations = relations(customerRewards, ({ one }) => ({
  business: one(businesses, { fields: [customerRewards.businessId], references: [businesses.id] }),
  campaign: one(campaigns, { fields: [customerRewards.campaignId], references: [campaigns.id] }),
}));

export const tapTrailsRelations = relations(tapTrails, ({ many }) => ({
  businesses: many(tapTrailBusinesses),
  customerProgress: many(customerTrailProgress),
}));

export const tapTrailBusinessesRelations = relations(tapTrailBusinesses, ({ one }) => ({
  trail: one(tapTrails, { fields: [tapTrailBusinesses.trailId], references: [tapTrails.id] }),
  business: one(businesses, { fields: [tapTrailBusinesses.businessId], references: [businesses.id] }),
}));

export const customerTrailProgressRelations = relations(customerTrailProgress, ({ one }) => ({
  trail: one(tapTrails, { fields: [customerTrailProgress.trailId], references: [tapTrails.id] }),
}));

export const referralsRelations = relations(referrals, ({ one }) => ({
  business: one(businesses, { fields: [referrals.businessId], references: [businesses.id] }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertBusinessSchema = createInsertSchema(businesses).omit({ id: true, createdAt: true });
export const insertCampaignSchema = createInsertSchema(campaigns).omit({ id: true, createdAt: true, currentRedemptions: true });
export const insertNfcTagSchema = createInsertSchema(nfcTags).omit({ id: true, createdAt: true });
export const insertTapSchema = createInsertSchema(taps).omit({ id: true, tappedAt: true });
export const insertCustomerRewardSchema = createInsertSchema(customerRewards).omit({ id: true, createdAt: true });
export const insertTapTrailSchema = createInsertSchema(tapTrails).omit({ id: true, createdAt: true });
export const insertTapTrailBusinessSchema = createInsertSchema(tapTrailBusinesses).omit({ id: true, createdAt: true });
export const insertCustomerTrailProgressSchema = createInsertSchema(customerTrailProgress).omit({ id: true, createdAt: true });
export const insertReferralSchema = createInsertSchema(referrals).omit({ id: true, createdAt: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Business = typeof businesses.$inferSelect;
export type InsertBusiness = z.infer<typeof insertBusinessSchema>;
export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type NfcTag = typeof nfcTags.$inferSelect;
export type InsertNfcTag = z.infer<typeof insertNfcTagSchema>;
export type Tap = typeof taps.$inferSelect;
export type InsertTap = z.infer<typeof insertTapSchema>;
export type CustomerReward = typeof customerRewards.$inferSelect;
export type InsertCustomerReward = z.infer<typeof insertCustomerRewardSchema>;
export type TapTrail = typeof tapTrails.$inferSelect;
export type InsertTapTrail = z.infer<typeof insertTapTrailSchema>;
export type TapTrailBusiness = typeof tapTrailBusinesses.$inferSelect;
export type InsertTapTrailBusiness = z.infer<typeof insertTapTrailBusinessSchema>;
export type CustomerTrailProgress = typeof customerTrailProgress.$inferSelect;
export type InsertCustomerTrailProgress = z.infer<typeof insertCustomerTrailProgressSchema>;
export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = z.infer<typeof insertReferralSchema>;
