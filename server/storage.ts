import { 
  users, businesses, campaigns, nfcTags, taps, customerRewards, tapTrails, 
  tapTrailBusinesses, customerTrailProgress, referrals,
  type User, type InsertUser, type Business, type InsertBusiness, 
  type Campaign, type InsertCampaign, type NfcTag, type InsertNfcTag,
  type Tap, type InsertTap, type CustomerReward, type InsertCustomerReward,
  type TapTrail, type InsertTapTrail, type TapTrailBusiness, type InsertTapTrailBusiness,
  type CustomerTrailProgress, type InsertCustomerTrailProgress,
  type Referral, type InsertReferral
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, count, sql, inArray } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Businesses
  getBusiness(id: string): Promise<Business | undefined>;
  getBusinessesByUser(userId: string): Promise<Business[]>;
  createBusiness(business: InsertBusiness): Promise<Business>;
  updateBusiness(id: string, updates: Partial<Business>): Promise<Business | undefined>;

  // Campaigns
  getCampaign(id: string): Promise<Campaign | undefined>;
  getCampaignsByBusiness(businessId: string): Promise<Campaign[]>;
  createCampaign(campaign: InsertCampaign): Promise<Campaign>;
  updateCampaign(id: string, updates: Partial<Campaign>): Promise<Campaign | undefined>;

  // NFC Tags
  getNfcTag(id: string): Promise<NfcTag | undefined>;
  getNfcTagsByBusiness(businessId: string): Promise<NfcTag[]>;
  createNfcTag(tag: InsertNfcTag): Promise<NfcTag>;
  updateNfcTag(id: string, updates: Partial<NfcTag>): Promise<NfcTag | undefined>;

  // Taps
  createTap(tap: InsertTap): Promise<Tap>;
  getTapsByBusiness(businessId: string, limit?: number): Promise<Tap[]>;
  getTapsByDate(businessId: string, startDate: Date, endDate: Date): Promise<Tap[]>;
  getTapStats(businessId: string): Promise<{
    totalTaps: number;
    activeCustomers: number;
    referrals: number;
    conversionRate: number;
  }>;

  // Customer Rewards
  getCustomerRewards(customerEmail: string): Promise<CustomerReward[]>;
  createCustomerReward(reward: InsertCustomerReward): Promise<CustomerReward>;
  redeemReward(id: string): Promise<CustomerReward | undefined>;

  // Tap Trails
  getTapTrails(): Promise<TapTrail[]>;
  createTapTrail(trail: InsertTapTrail): Promise<TapTrail>;
  addBusinessToTrail(trailBusiness: InsertTapTrailBusiness): Promise<TapTrailBusiness>;
  getCustomerTrailProgress(customerEmail: string, trailId: string): Promise<CustomerTrailProgress | undefined>;
  updateCustomerTrailProgress(progress: InsertCustomerTrailProgress): Promise<CustomerTrailProgress>;

  // Referrals
  createReferral(referral: InsertReferral): Promise<Referral>;
  getReferralsByBusiness(businessId: string): Promise<Referral[]>;

  // Analytics
  getBusinessAnalytics(businessId: string): Promise<{
    totalTaps: number;
    uniqueCustomers: number;
    campaignPerformance: { campaignName: string; taps: number }[];
    recentActivity: Tap[];
  }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getBusiness(id: string): Promise<Business | undefined> {
    const [business] = await db.select().from(businesses).where(eq(businesses.id, id));
    return business || undefined;
  }

  async getBusinessesByUser(userId: string): Promise<Business[]> {
    return await db.select().from(businesses).where(eq(businesses.userId, userId));
  }

  async createBusiness(insertBusiness: InsertBusiness): Promise<Business> {
    const [business] = await db.insert(businesses).values(insertBusiness).returning();
    return business;
  }

  async updateBusiness(id: string, updates: Partial<Business>): Promise<Business | undefined> {
    const [business] = await db.update(businesses).set(updates).where(eq(businesses.id, id)).returning();
    return business || undefined;
  }

  async getCampaign(id: string): Promise<Campaign | undefined> {
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id));
    return campaign || undefined;
  }

  async getCampaignsByBusiness(businessId: string): Promise<Campaign[]> {
    return await db.select().from(campaigns).where(eq(campaigns.businessId, businessId)).orderBy(desc(campaigns.createdAt));
  }

  async createCampaign(insertCampaign: InsertCampaign): Promise<Campaign> {
    const [campaign] = await db.insert(campaigns).values(insertCampaign).returning();
    return campaign;
  }

  async updateCampaign(id: string, updates: Partial<Campaign>): Promise<Campaign | undefined> {
    const [campaign] = await db.update(campaigns).set(updates).where(eq(campaigns.id, id)).returning();
    return campaign || undefined;
  }

  async getNfcTag(id: string): Promise<NfcTag | undefined> {
    const [tag] = await db.select().from(nfcTags).where(eq(nfcTags.id, id));
    return tag || undefined;
  }

  async getNfcTagsByBusiness(businessId: string): Promise<NfcTag[]> {
    return await db.select().from(nfcTags).where(eq(nfcTags.businessId, businessId));
  }

  async createNfcTag(insertTag: InsertNfcTag): Promise<NfcTag> {
    const [tag] = await db.insert(nfcTags).values(insertTag).returning();
    return tag;
  }

  async updateNfcTag(id: string, updates: Partial<NfcTag>): Promise<NfcTag | undefined> {
    const [tag] = await db.update(nfcTags).set(updates).where(eq(nfcTags.id, id)).returning();
    return tag || undefined;
  }

  async createTap(insertTap: InsertTap): Promise<Tap> {
    const [tap] = await db.insert(taps).values(insertTap).returning();
    return tap;
  }

  async getTapsByBusiness(businessId: string, limit: number = 50): Promise<Tap[]> {
    return await db.select().from(taps).where(eq(taps.businessId, businessId)).orderBy(desc(taps.tappedAt)).limit(limit);
  }

  async getTapsByDate(businessId: string, startDate: Date, endDate: Date): Promise<Tap[]> {
    return await db.select().from(taps)
      .where(and(
        eq(taps.businessId, businessId),
        sql`${taps.tappedAt} >= ${startDate}`,
        sql`${taps.tappedAt} <= ${endDate}`
      ));
  }

  async getTapStats(businessId: string): Promise<{
    totalTaps: number;
    activeCustomers: number;
    referrals: number;
    conversionRate: number;
  }> {
    const [totalTapsResult] = await db.select({ count: count() }).from(taps).where(eq(taps.businessId, businessId));
    const totalTaps = totalTapsResult.count;

    const [uniqueCustomersResult] = await db.select({ count: sql`count(distinct ${taps.customerEmail})` }).from(taps).where(eq(taps.businessId, businessId));
    const activeCustomers = Number(uniqueCustomersResult.count);

    const [referralsResult] = await db.select({ count: count() }).from(referrals).where(eq(referrals.businessId, businessId));
    const referralsCount = referralsResult.count;

    const conversionRate = activeCustomers > 0 ? (activeCustomers / totalTaps) * 100 : 0;

    return {
      totalTaps,
      activeCustomers,
      referrals: referralsCount,
      conversionRate: Number(conversionRate.toFixed(1))
    };
  }

  async getCustomerRewards(customerEmail: string): Promise<CustomerReward[]> {
    return await db.select().from(customerRewards).where(eq(customerRewards.customerEmail, customerEmail));
  }

  async createCustomerReward(insertReward: InsertCustomerReward): Promise<CustomerReward> {
    const [reward] = await db.insert(customerRewards).values(insertReward).returning();
    return reward;
  }

  async redeemReward(id: string): Promise<CustomerReward | undefined> {
    const [reward] = await db.update(customerRewards)
      .set({ isRedeemed: true, redeemedAt: sql`now()` })
      .where(eq(customerRewards.id, id))
      .returning();
    return reward || undefined;
  }

  async getTapTrails(): Promise<TapTrail[]> {
    return await db.select().from(tapTrails).where(eq(tapTrails.isActive, true));
  }

  async createTapTrail(insertTrail: InsertTapTrail): Promise<TapTrail> {
    const [trail] = await db.insert(tapTrails).values(insertTrail).returning();
    return trail;
  }

  async addBusinessToTrail(insertTrailBusiness: InsertTapTrailBusiness): Promise<TapTrailBusiness> {
    const [trailBusiness] = await db.insert(tapTrailBusinesses).values(insertTrailBusiness).returning();
    return trailBusiness;
  }

  async getCustomerTrailProgress(customerEmail: string, trailId: string): Promise<CustomerTrailProgress | undefined> {
    const [progress] = await db.select().from(customerTrailProgress)
      .where(and(
        eq(customerTrailProgress.customerEmail, customerEmail),
        eq(customerTrailProgress.trailId, trailId)
      ));
    return progress || undefined;
  }

  async updateCustomerTrailProgress(insertProgress: InsertCustomerTrailProgress): Promise<CustomerTrailProgress> {
    const [progress] = await db.insert(customerTrailProgress).values(insertProgress)
      .onConflictDoUpdate({
        target: [customerTrailProgress.customerEmail, customerTrailProgress.trailId],
        set: {
          businessesVisited: insertProgress.businessesVisited,
          isCompleted: insertProgress.isCompleted,
          completedAt: insertProgress.completedAt
        }
      })
      .returning();
    return progress;
  }

  async createReferral(insertReferral: InsertReferral): Promise<Referral> {
    const [referral] = await db.insert(referrals).values(insertReferral).returning();
    return referral;
  }

  async getReferralsByBusiness(businessId: string): Promise<Referral[]> {
    return await db.select().from(referrals).where(eq(referrals.businessId, businessId));
  }

  async getBusinessAnalytics(businessId: string): Promise<{
    totalTaps: number;
    uniqueCustomers: number;
    campaignPerformance: { campaignName: string; taps: number }[];
    recentActivity: Tap[];
  }> {
    const [totalTapsResult] = await db.select({ count: count() }).from(taps).where(eq(taps.businessId, businessId));
    const totalTaps = totalTapsResult.count;

    const [uniqueCustomersResult] = await db.select({ count: sql`count(distinct ${taps.customerEmail})` }).from(taps).where(eq(taps.businessId, businessId));
    const uniqueCustomers = Number(uniqueCustomersResult.count);

    const campaignPerformance = await db.select({
      campaignName: campaigns.name,
      taps: count(taps.id)
    })
    .from(campaigns)
    .leftJoin(taps, eq(campaigns.id, taps.campaignId))
    .where(eq(campaigns.businessId, businessId))
    .groupBy(campaigns.id, campaigns.name);

    const recentActivity = await db.select().from(taps)
      .where(eq(taps.businessId, businessId))
      .orderBy(desc(taps.tappedAt))
      .limit(10);

    return {
      totalTaps,
      uniqueCustomers,
      campaignPerformance,
      recentActivity
    };
  }
}

export const storage = new DatabaseStorage();
