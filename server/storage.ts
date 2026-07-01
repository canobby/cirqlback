import {
  users,
  businesses,
  campaigns,
  nfcTags,
  taps,
  rewards,
  referrals,
  tapTrails,
  userTrailProgress,
  salesData,
  monthlySalesSummary,
  businessGoals,
  type User,
  type UpsertUser,
  type Business,
  type InsertBusiness,
  type Campaign,
  type InsertCampaign,
  type NfcTag,
  type InsertNfcTag,
  type Tap,
  type InsertTap,
  type Reward,
  type InsertReward,
  type Referral,
  type InsertReferral,
  type TapTrail,
  type InsertTapTrail,
  type UserTrailProgress,
  type InsertUserTrailProgress,
  type SalesData,
  type InsertSalesData,
  type MonthlySalesSummary,
  type InsertMonthlySalesSummary,
  type BusinessGoals,
  type InsertBusinessGoals,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, count } from "drizzle-orm";
import { tierForPoints, levelForPoints, pointsToNextLevel } from "./gamification";

export interface IStorage {
  // User operations (required for auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  createUser(user: UpsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  updateUserPoints(userId: string, points: number): Promise<void>;
  updateUserSubscription(userId: string, updates: { 
    subscriptionTier?: string; 
    subscriptionStatus?: string; 
    starterExpiresAt?: Date;
    trialDiscountTier?: string;
    trialDiscountEndsAt?: Date;
    trialDiscountActive?: boolean;
  }): Promise<User>;
  
  // Business operations
  getBusinesses(): Promise<Business[]>;
  getBusiness(id: string): Promise<Business | undefined>;
  getBusinessesByOwner(ownerId: string): Promise<Business[]>;
  getUserBusinesses(userId: string): Promise<Business[]>;
  createBusiness(business: InsertBusiness): Promise<Business>;
  updateBusiness(id: string, updates: Partial<Business>): Promise<Business>;
  
  // Campaign operations  
  getCampaigns(businessId?: string): Promise<Campaign[]>;
  getCampaign(id: string): Promise<Campaign | undefined>;
  createCampaign(campaign: InsertCampaign): Promise<Campaign>;
  updateCampaign(id: string, updates: Partial<Campaign>): Promise<Campaign>;
  
  // NFC Tag operations
  getNFCTags(businessId: string): Promise<NfcTag[]>;
  getNFCTag(id: string): Promise<NfcTag | undefined>;
  getNFCTagByIdentifier(identifier: string): Promise<NfcTag | undefined>;
  createNFCTag(tag: InsertNfcTag): Promise<NfcTag>;
  updateNFCTag(id: string, updates: Partial<NfcTag>): Promise<NfcTag>;
  deleteNFCTag(id: string): Promise<boolean>;
  
  // Tap operations
  processTap(tap: InsertTap): Promise<{ success: boolean; reward?: Reward; pointsEarned?: number; message: string }>;
  getTaps(businessId?: string, customerEmail?: string): Promise<Tap[]>;
  
  // Reward operations
  getReward(id: string): Promise<Reward | undefined>;
  getRewardsByUser(userId: string): Promise<Reward[]>;
  getRewardsByEmail(email: string): Promise<Reward[]>;
  redeemReward(rewardId: string): Promise<Reward>;
  
  // Referral operations
  createReferral(referral: InsertReferral): Promise<Referral>;
  getReferralsByUser(userId: string): Promise<Referral[]>;
  processReferralCompletion(refereeEmail: string): Promise<void>;
  
  // Tap Trail operations
  getTapTrails(): Promise<TapTrail[]>;
  getUserTrailProgress(userId: string): Promise<UserTrailProgress[]>;
  updateTrailProgress(userId: string, trailId: string, businessId: string): Promise<void>;
  
  // Analytics and reporting
  getBusinessAnalytics(businessId?: string, customerEmail?: string): Promise<any>;
  getUserActivity(userId: string): Promise<any>;
  getCustomerInsights(businessId: string): Promise<any>;

  // Sales Data Input System
  addSalesData(data: InsertSalesData): Promise<SalesData>;
  getSalesData(businessId: string): Promise<SalesData[]>;
  getRealVsPlatformComparison(businessId: string): Promise<any>;
  addBusinessGoal(goal: InsertBusinessGoals): Promise<BusinessGoals>;
  getBusinessGoals(businessId: string): Promise<BusinessGoals[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations (required for auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Set starter expiration date for new users (6 months from now)
    const userDataWithExpiration = {
      ...userData,
      starterExpiresAt: userData.subscriptionTier === 'starter' || !userData.subscriptionTier ? 
        new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000) : // 6 months 
        userData.starterExpiresAt
    };

    const [user] = await db
      .insert(users)
      .values(userDataWithExpiration)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async createUser(userData: UpsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async getReward(id: string): Promise<Reward | undefined> {
    const [reward] = await db.select().from(rewards).where(eq(rewards.id, id));
    return reward || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.email, email));
      return user || undefined;
    } catch (error) {
      console.error("Database error in getUserByEmail:", error);
      return undefined;
    }
  }

  async updateUserPoints(userId: string, points: number): Promise<void> {
    await db
      .update(users)
      .set({
        totalPoints: sql`${users.totalPoints} + ${points}`,
        availablePoints: sql`${users.availablePoints} + ${points}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  // CHR-28: real leaderboard — top players by lifetime points earned.
  async getLeaderboard(limit = 10): Promise<any[]> {
    const rows = await db
      .select()
      .from(users)
      .orderBy(desc(users.totalPointsEarned))
      .limit(limit);
    return rows.map((u, i) => {
      const points = u.totalPointsEarned ?? 0;
      return {
        id: u.id,
        rank: i + 1,
        name:
          [u.firstName, u.lastName].filter(Boolean).join(" ").trim() ||
          u.email ||
          "Cirqler",
        tier: tierForPoints(points),
        level: levelForPoints(points),
        location: "",
        points,
        avatar: u.profileImageUrl ?? null,
      };
    });
  }

  // CHR-28: streamlined daily challenges with real, per-user progress derived
  // from today's taps and reward redemptions. No separate progress table.
  async getDailyChallenges(email?: string): Promise<any[]> {
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const hoursLeft = Math.max(
      1,
      Math.round((dayStart.getTime() + 86_400_000 - now.getTime()) / 3_600_000)
    );
    const timeLeft = `${hoursLeft}h left`;

    let todayTaps = 0;
    let todayPoints = 0;
    let todayRedemptions = 0;
    if (email) {
      const userTaps = (await this.getTaps(undefined, email)).filter(
        (t) => t.createdAt && new Date(t.createdAt) >= dayStart
      );
      todayTaps = userTaps.length;
      todayPoints = userTaps.reduce((s, t) => s + (t.pointsEarned ?? 0), 0);
      const user = await this.getUserByEmail(email);
      if (user) {
        const userRewards = await this.getRewardsByUser(user.id);
        todayRedemptions = userRewards.filter(
          (r) => r.isRedeemed && r.redeemedAt && new Date(r.redeemedAt) >= dayStart
        ).length;
      }
    }

    // Participants: distinct customers active platform-wide today.
    const allTapsToday = (await this.getTaps()).filter(
      (t) => t.createdAt && new Date(t.createdAt) >= dayStart
    );
    const participants = new Set(
      allTapsToday.map((t) => t.customerEmail).filter(Boolean)
    ).size;

    const pct = (have: number, need: number) =>
      need <= 0 ? 0 : Math.min(100, Math.round((have / need) * 100));

    return [
      {
        id: "daily-tap",
        title: "Daily Tap",
        description: "Make your first tap today",
        difficulty: "Easy",
        goal: 1,
        current: todayTaps,
        progress: pct(todayTaps, 1),
        reward: 20,
        timeLeft,
        participants,
        joined: true,
      },
      {
        id: "point-collector",
        title: "Point Collector",
        description: "Earn 100 points today",
        difficulty: "Medium",
        goal: 100,
        current: todayPoints,
        progress: pct(todayPoints, 100),
        reward: 50,
        timeLeft,
        participants,
        joined: true,
      },
      {
        id: "reward-redeemer",
        title: "Reward Redeemer",
        description: "Redeem a reward today",
        difficulty: "Medium",
        goal: 1,
        current: todayRedemptions,
        progress: pct(todayRedemptions, 1),
        reward: 40,
        timeLeft,
        participants,
        joined: true,
      },
    ];
  }

  // CHR-28: the authenticated player's real stats (rank, tier, level, streak,
  // points, monthly earnings, and today's completed daily challenges).
  async getUserGamificationStats(userId: string): Promise<any> {
    const user = await this.getUser(userId);
    if (!user) return null;

    const points = user.totalPointsEarned ?? 0;
    const higher = await db
      .select({ c: count() })
      .from(users)
      .where(sql`COALESCE(${users.totalPointsEarned}, 0) > ${points}`);
    const rank = Number(higher[0]?.c ?? 0) + 1;

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const earnedThisMonth = user.email
      ? (await this.getTaps(undefined, user.email))
          .filter((t) => t.createdAt && new Date(t.createdAt) >= monthStart)
          .reduce((s, t) => s + (t.pointsEarned ?? 0), 0)
      : 0;

    const daily = await this.getDailyChallenges(user.email ?? undefined);
    const challengesCompleted = daily.filter((c) => c.progress >= 100).length;

    const referralCode =
      user.referralCode ||
      "CIRQL" + userId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase();

    return {
      rank,
      totalPoints: user.totalPoints ?? 0,
      totalPointsEarned: points,
      availablePoints: user.availablePoints ?? 0,
      tier: tierForPoints(points),
      level: levelForPoints(points),
      pointsToNextLevel: pointsToNextLevel(points),
      currentStreak: user.currentStreak ?? 0,
      longestStreak: user.longestStreak ?? 0,
      challengesCompleted,
      referralCode,
      earnedThisMonth,
    };
  }

  async updateUserSubscription(userId: string, updates: { 
    subscriptionTier?: string; 
    subscriptionStatus?: string; 
    starterExpiresAt?: Date;
    trialDiscountTier?: string;
    trialDiscountEndsAt?: Date;
    trialDiscountActive?: boolean;
  }): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Business operations
  async getBusinesses(): Promise<Business[]> {
    return await db.select().from(businesses).where(eq(businesses.isActive, true));
  }

  async getBusiness(id: string): Promise<Business | undefined> {
    const [business] = await db.select().from(businesses).where(eq(businesses.id, id));
    return business || undefined;
  }

  async getBusinessesByOwner(ownerId: string): Promise<Business[]> {
    return await db.select().from(businesses).where(eq(businesses.ownerId, ownerId));
  }

  async getUserBusinesses(userId: string): Promise<Business[]> {
    return await db.select().from(businesses).where(eq(businesses.ownerId, userId));
  }

  async createBusiness(business: InsertBusiness): Promise<Business> {
    const [newBusiness] = await db.insert(businesses).values(business).returning();
    return newBusiness;
  }

  async updateBusiness(id: string, updates: Partial<Business>): Promise<Business> {
    const [business] = await db
      .update(businesses)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(businesses.id, id))
      .returning();
    return business;
  }

  // Campaign operations
  async getCampaigns(businessId?: string): Promise<Campaign[]> {
    if (businessId) {
      return await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.businessId, businessId))
        .orderBy(desc(campaigns.createdAt));
    }
    return await db.select().from(campaigns).orderBy(desc(campaigns.createdAt));
  }

  async getCampaign(id: string): Promise<Campaign | undefined> {
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id));
    return campaign || undefined;
  }

  async createCampaign(campaign: InsertCampaign): Promise<Campaign> {
    const [newCampaign] = await db.insert(campaigns).values(campaign).returning();
    return newCampaign;
  }

  async updateCampaign(id: string, updates: Partial<Campaign>): Promise<Campaign> {
    const [campaign] = await db
      .update(campaigns)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(campaigns.id, id))
      .returning();
    return campaign;
  }

  // NFC Tag operations
  async getNFCTags(businessId: string): Promise<NfcTag[]> {
    return await db.select().from(nfcTags).where(eq(nfcTags.businessId, businessId));
  }

  async getNFCTag(id: string): Promise<NfcTag | undefined> {
    const [tag] = await db.select().from(nfcTags).where(eq(nfcTags.id, id));
    return tag || undefined;
  }

  async getNFCTagByIdentifier(identifier: string): Promise<NfcTag | undefined> {
    const [tag] = await db.select().from(nfcTags).where(eq(nfcTags.tagIdentifier, identifier));
    return tag || undefined;
  }

  async createNFCTag(tag: InsertNfcTag): Promise<NfcTag> {
    const [newTag] = await db.insert(nfcTags).values(tag).returning();
    return newTag;
  }

  async updateNFCTag(id: string, updates: Partial<NfcTag>): Promise<NfcTag> {
    const [tag] = await db
      .update(nfcTags)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(nfcTags.id, id))
      .returning();
    return tag;
  }

  async deleteNFCTag(id: string): Promise<boolean> {
    const result = await db.delete(nfcTags).where(eq(nfcTags.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getNFCTagAnalytics(businessId: string, timeRange: string): Promise<any[]> {
    // This would implement complex analytics queries
    // For now, return empty array as real implementation would require
    // aggregation queries across taps, rewards, and user engagement data
    return [];
  }

  // Tap operations
  async processTap(tap: InsertTap): Promise<{ success: boolean; reward?: Reward; pointsEarned?: number; message: string }> {
    try {
      // Anti-abuse: reject a repeat tap of the same tag by the same customer
      // within a short cooldown window.
      const COOLDOWN_MS = 60 * 1000;
      const [recent] = await db
        .select()
        .from(taps)
        .where(and(eq(taps.tagId, tap.tagId), eq(taps.customerEmail, tap.customerEmail)))
        .orderBy(desc(taps.createdAt))
        .limit(1);
      if (recent?.createdAt && Date.now() - recent.createdAt.getTime() < COOLDOWN_MS) {
        return {
          success: false,
          message: "You've already tapped this tag. Please wait a moment before tapping again.",
        };
      }

      // Resolve the campaign (if any) to determine reward + points.
      const campaign = tap.campaignId ? await this.getCampaign(tap.campaignId) : undefined;
      const campaignActive = !!campaign && campaign.isActive === true;
      const points = campaignActive ? (campaign!.pointsAwarded ?? 0) : 0;
      const customer = tap.customerEmail ? await this.getUserByEmail(tap.customerEmail) : undefined;

      // Record the tap (with the points earned).
      const [newTap] = await db
        .insert(taps)
        .values({ ...tap, pointsEarned: points })
        .returning();

      // Update tap counters.
      await db
        .update(nfcTags)
        .set({ totalTaps: sql`${nfcTags.totalTaps} + 1`, lastTapAt: new Date() })
        .where(eq(nfcTags.id, tap.tagId));
      await db
        .update(businesses)
        .set({ totalTaps: sql`${businesses.totalTaps} + 1` })
        .where(eq(businesses.id, tap.businessId));

      // Create a reward from the active campaign, owned by the customer (if they
      // have an account) so they can later redeem it.
      let reward: Reward | undefined;
      if (campaignActive && campaign) {
        const [newReward] = await db
          .insert(rewards)
          .values({
            userId: customer?.id ?? null,
            businessId: tap.businessId,
            campaignId: campaign.id,
            tapId: newTap.id,
            type: campaign.type,
            title: `${campaign.name} Reward`,
            description: campaign.description || `Reward from ${campaign.name}`,
            value: campaign.value,
            code: `CIRQ${Date.now()}`,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          })
          .returning();
        reward = newReward;

        await db
          .update(campaigns)
          .set({ currentRedemptions: sql`${campaigns.currentRedemptions} + 1` })
          .where(eq(campaigns.id, campaign.id));
      }

      // Award points to the customer's account (if they have one).
      if (points > 0 && customer) {
        await db
          .update(users)
          .set({
            totalPoints: sql`${users.totalPoints} + ${points}`,
            availablePoints: sql`${users.availablePoints} + ${points}`,
            totalPointsEarned: sql`${users.totalPointsEarned} + ${points}`,
          })
          .where(eq(users.id, customer.id));
      }

      return {
        success: true,
        reward,
        pointsEarned: points,
        message: reward
          ? "Tap successful! Reward earned."
          : points > 0
          ? "Tap successful! Points earned."
          : "Tap recorded successfully.",
      };
    } catch (error) {
      console.error("Error processing tap:", error);
      return {
        success: false,
        message: "Failed to process tap. Please try again.",
      };
    }
  }

  async getTaps(businessId?: string, customerEmail?: string): Promise<Tap[]> {
    const conditions = [];
    if (businessId) conditions.push(eq(taps.businessId, businessId));
    if (customerEmail) conditions.push(eq(taps.customerEmail, customerEmail));

    return await db
      .select()
      .from(taps)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(taps.createdAt));
  }

  // Reward operations
  async getRewardsByUser(userId: string): Promise<Reward[]> {
    return await db.select().from(rewards).where(eq(rewards.userId, userId));
  }

  async getRewardsByEmail(email: string): Promise<Reward[]> {
    // First find user by email, then get their rewards
    const user = await this.getUserByEmail(email);
    if (!user) return [];
    return await this.getRewardsByUser(user.id);
  }

  async redeemReward(rewardId: string): Promise<Reward> {
    const [reward] = await db
      .update(rewards)
      .set({ isRedeemed: true, redeemedAt: new Date() })
      .where(eq(rewards.id, rewardId))
      .returning();
    return reward;
  }

  // Referral operations
  async createReferral(referral: InsertReferral): Promise<Referral> {
    const [newReferral] = await db.insert(referrals).values(referral).returning();
    return newReferral;
  }

  async getReferralsByUser(userId: string): Promise<Referral[]> {
    return await db.select().from(referrals).where(eq(referrals.referrerId, userId));
  }

  async processReferralCompletion(refereeEmail: string): Promise<void> {
    // Update referral status when referee completes first action
    await db
      .update(referrals)
      .set({ status: "completed", completedAt: new Date() })
      .where(and(eq(referrals.refereeEmail, refereeEmail), eq(referrals.status, "pending")));
  }

  // Tap Trail operations
  async getTapTrails(): Promise<TapTrail[]> {
    return await db.select().from(tapTrails).where(eq(tapTrails.isActive, true));
  }

  async getUserTrailProgress(userId: string): Promise<UserTrailProgress[]> {
    return await db.select().from(userTrailProgress).where(eq(userTrailProgress.userId, userId));
  }

  async updateTrailProgress(userId: string, trailId: string, businessId: string): Promise<void> {
    // Get existing progress
    const [existingProgress] = await db
      .select()
      .from(userTrailProgress)
      .where(and(eq(userTrailProgress.userId, userId), eq(userTrailProgress.trailId, trailId)));

    if (existingProgress) {
      // Update existing progress
      const completedBusinesses = existingProgress.completedBusinesses as string[] || [];
      if (!completedBusinesses.includes(businessId)) {
        completedBusinesses.push(businessId);
        
        // Check if trail is completed
        const trail = await db.select().from(tapTrails).where(eq(tapTrails.id, trailId));
        const requiredBusinesses = trail[0]?.requiredBusinesses as string[] || [];
        const isCompleted = requiredBusinesses.every(reqBusiness => completedBusinesses.includes(reqBusiness));

        await db
          .update(userTrailProgress)
          .set({
            completedBusinesses,
            isCompleted,
            completedAt: isCompleted ? new Date() : null,
          })
          .where(and(eq(userTrailProgress.userId, userId), eq(userTrailProgress.trailId, trailId)));
      }
    } else {
      // Create new progress
      await db.insert(userTrailProgress).values({
        userId,
        trailId,
        completedBusinesses: [businessId],
        isCompleted: false,
      });
    }
  }

  async getUserActivity(userId: string): Promise<any> {
    return { userId, activity: "placeholder" };
  }

  async getCustomerInsights(businessId: string): Promise<any> {
    return { businessId, insights: "placeholder" };
  }

  // Sales Data Input System Implementation
  async addSalesData(data: InsertSalesData): Promise<SalesData> {
    const [salesRecord] = await db
      .insert(salesData)
      .values({
        id: crypto.randomUUID(),
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return salesRecord;
  }

  async getSalesData(businessId: string): Promise<SalesData[]> {
    return await db
      .select()
      .from(salesData)
      .where(eq(salesData.businessId, businessId))
      .orderBy(desc(salesData.date));
  }

  // CHR-27: real analytics dashboard aggregation. Scoped to one business when
  // businessId is given, otherwise platform-wide. No random/hardcoded values —
  // everything is derived from taps, rewards, campaigns, sales-data, and tags.
  async getBusinessAnalytics(businessId?: string, customerEmail?: string): Promise<any> {
    const num = (v: unknown): number => {
      const n = parseFloat(String(v ?? "0"));
      return Number.isFinite(n) ? n : 0;
    };

    const tapRows = await this.getTaps(businessId, customerEmail);
    const campaignRows = await this.getCampaigns(businessId);
    const rewardRows = businessId
      ? await db.select().from(rewards).where(eq(rewards.businessId, businessId))
      : await db.select().from(rewards);
    const salesRows = businessId
      ? await this.getSalesData(businessId)
      : await db.select().from(salesData).orderBy(desc(salesData.date));
    const tagRows = businessId
      ? await this.getNFCTags(businessId)
      : await db.select().from(nfcTags);

    // Core metrics
    const totalTaps = tapRows.length;
    const activeCustomers = new Set(
      tapRows.map((t) => t.customerEmail).filter(Boolean)
    ).size;
    const rewardsIssued = rewardRows.length;
    const rewardsRedeemed = rewardRows.filter((r) => r.isRedeemed).length;
    const conversionRate =
      rewardsIssued > 0
        ? Math.round((rewardsRedeemed / rewardsIssued) * 1000) / 10
        : 0;

    // Revenue: prefer real sales-data; fall back to tap reward values.
    const salesRevenue = salesRows.reduce((s, r) => s + num(r.totalSales), 0);
    const cirqlDrivenRevenue = salesRows.reduce(
      (s, r) => s + num(r.cirqlDrivenSales),
      0
    );
    const tapRewardValue = tapRows.reduce((s, t) => s + num(t.rewardValue), 0);
    const totalRevenue = salesRevenue > 0 ? salesRevenue : tapRewardValue;
    const newCustomers = salesRows.reduce((s, r) => s + (r.newCustomers ?? 0), 0);
    const returningCustomers = salesRows.reduce(
      (s, r) => s + (r.returningCustomers ?? 0),
      0
    );
    const salesCustomerCount = salesRows.reduce(
      (s, r) => s + (r.customerCount ?? 0),
      0
    );
    const avgOrderValue =
      salesCustomerCount > 0
        ? Math.round((salesRevenue / salesCustomerCount) * 100) / 100
        : activeCustomers > 0
        ? Math.round((totalRevenue / activeCustomers) * 100) / 100
        : 0;

    // Hourly buckets from tap timestamps
    const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      taps: 0,
      revenue: 0,
    }));
    for (const t of tapRows) {
      const h = t.createdAt ? new Date(t.createdAt).getHours() : 0;
      hourlyData[h].taps += 1;
      hourlyData[h].revenue += num(t.rewardValue);
    }
    const fmtHour = (h: number): string => {
      const am = h < 12;
      const hr = h % 12 === 0 ? 12 : h % 12;
      return `${hr} ${am ? "AM" : "PM"}`;
    };
    const peak = hourlyData.reduce(
      (best, cur) => (cur.taps > best.taps ? cur : best),
      hourlyData[0]
    );
    const peakHour =
      totalTaps > 0
        ? `${fmtHour(peak.hour)}-${fmtHour((peak.hour + 2) % 24)}`
        : "—";

    // Top campaigns by tap volume
    const tapsByCampaign = new Map<string, number>();
    const revByCampaign = new Map<string, number>();
    for (const t of tapRows) {
      if (!t.campaignId) continue;
      tapsByCampaign.set(t.campaignId, (tapsByCampaign.get(t.campaignId) ?? 0) + 1);
      revByCampaign.set(
        t.campaignId,
        (revByCampaign.get(t.campaignId) ?? 0) + num(t.rewardValue)
      );
    }
    const topCampaigns = campaignRows
      .map((c) => ({
        id: c.id,
        name: c.name,
        taps: tapsByCampaign.get(c.id) ?? 0,
        revenue: Math.round((revByCampaign.get(c.id) ?? 0) * 100) / 100,
      }))
      .sort((a, b) => b.taps - a.taps)
      .slice(0, 5);

    // Top locations by tag placement
    const tagLocation = new Map<string, string>();
    for (const tag of tagRows) {
      tagLocation.set(tag.id, tag.location || tag.customLabel || "Unlabeled");
    }
    const tapsByLocation = new Map<string, number>();
    for (const t of tapRows) {
      const loc = tagLocation.get(t.tagId) || "Unknown";
      tapsByLocation.set(loc, (tapsByLocation.get(loc) ?? 0) + 1);
    }
    const topLocations = Array.from(tapsByLocation.entries())
      .map(([name, taps]) => ({
        name,
        taps,
        percentage: totalTaps > 0 ? Math.round((taps / totalTaps) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.taps - a.taps)
      .slice(0, 5);

    // Recent activity: latest taps + latest redemptions, merged by time
    const tapActivity = tapRows.slice(0, 8).map((t) => ({
      kind: "tap" as const,
      action: `Tap${t.customerName ? ` by ${t.customerName}` : ""}`,
      at: t.createdAt ? new Date(t.createdAt).getTime() : 0,
      timestamp: t.createdAt ? new Date(t.createdAt).toISOString() : null,
      value: `+${t.pointsEarned ?? 0} pts`,
    }));
    const redemptionActivity = rewardRows
      .filter((r) => r.isRedeemed && r.redeemedAt)
      .map((r) => ({
        kind: "redemption" as const,
        action: `Reward redeemed — ${r.title}`,
        at: new Date(r.redeemedAt as Date).getTime(),
        timestamp: new Date(r.redeemedAt as Date).toISOString(),
        value: r.value ? `$${num(r.value).toFixed(2)}` : "",
      }));
    const recentActivity = [...tapActivity, ...redemptionActivity]
      .sort((a, b) => b.at - a.at)
      .slice(0, 6)
      .map(({ kind, action, timestamp, value }) => ({
        kind,
        action,
        timestamp,
        value,
      }));

    return {
      totalTaps,
      totalRevenue,
      activeCustomers,
      conversionRate,
      avgOrderValue,
      cirqlDrivenRevenue,
      rewardsIssued,
      rewardsRedeemed,
      newCustomers,
      returningCustomers,
      peakHour,
      topCampaigns,
      topLocations,
      recentActivity,
      hourlyData,
    };
  }

  async getRealVsPlatformComparison(businessId: string): Promise<any> {
    // Get recent sales data
    const recentSales = await this.getSalesData(businessId);
    
    // Get platform tap data for comparison
    const recentTaps = await db
      .select()
      .from(taps)
      .where(eq(taps.businessId, businessId));
    
    if (recentSales.length === 0) {
      return {
        realData: { totalSales: 0, cirqlDrivenSales: 0, cirqlROI: 0 },
        platformEstimates: { totalTaps: recentTaps.length, estimatedRevenue: recentTaps.length * 15, estimatedCustomers: recentTaps.length },
        insights: { 
          isOutperforming: false, 
          recommendedActions: ["Start inputting daily sales data for accurate comparisons"] 
        },
        accuracy: { hasRealData: false }
      };
    }

    const totalRealSales = recentSales.reduce((sum, sale) => sum + parseFloat(sale.totalSales), 0);
    const totalCirqlSales = recentSales.reduce((sum, sale) => sum + parseFloat(sale.cirqlDrivenSales || "0"), 0);
    const cirqlROI = totalRealSales > 0 ? (totalCirqlSales / totalRealSales) * 100 : 0;

    return {
      realData: {
        totalSales: totalRealSales,
        cirqlDrivenSales: totalCirqlSales,
        cirqlROI: cirqlROI
      },
      platformEstimates: {
        totalTaps: recentTaps.length,
        estimatedRevenue: recentTaps.length * 15,
        estimatedCustomers: recentTaps.length
      },
      insights: {
        isOutperforming: cirqlROI > 20,
        recommendedActions: [
          cirqlROI < 10 ? "Consider optimizing Cirql tag placement" : "Great ROI performance!",
          recentTaps.length > 50 ? "High tap engagement" : "Increase marketing campaigns"
        ]
      },
      accuracy: { hasRealData: true }
    };
  }

  async addBusinessGoal(goal: InsertBusinessGoals): Promise<BusinessGoals> {
    const [goalRecord] = await db
      .insert(businessGoals)
      .values({
        id: crypto.randomUUID(),
        ...goal,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return goalRecord;
  }

  async getBusinessGoals(businessId: string): Promise<BusinessGoals[]> {
    return await db
      .select()
      .from(businessGoals)
      .where(eq(businessGoals.businessId, businessId))
      .orderBy(desc(businessGoals.createdAt));
  }
}

export const storage = new DatabaseStorage();