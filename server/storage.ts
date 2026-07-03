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
  coordinators,
  territories,
  regionalOffers,
  groupCampaigns,
  groupCampaignMembers,
  groupCampaignProgress,
  coordinatorEarnings,
  coordinatorPayouts,
  businessAddons,
  businessTapBranding,
  adminUsers,
  adminAudit,
  donationCampaigns,
  donationCampaignMembers,
  donations,
  customerFavorites,
  businessReminders,
  messageThreads,
  messages,
  broadcasts,
  userBroadcastState,
  rewardAdjustments,
  rewardContributions,
  rewardSettlements,
  badgeDefinitions,
  badgeAwards,
  pointRewards,
  pointRedemptions,
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
  type Coordinator,
  type InsertCoordinator,
  type Territory,
  type InsertTerritory,
  type RegionalOffer,
  type InsertRegionalOffer,
  type GroupCampaign,
  type InsertGroupCampaign,
  type GroupCampaignMember,
  type CoordinatorEarning,
  type CoordinatorPayout,
  type BusinessAddon,
  type BusinessTapBranding,
  type DonationCampaign,
  type InsertDonationCampaign,
  type SalesData,
  type InsertSalesData,
  type MonthlySalesSummary,
  type InsertMonthlySalesSummary,
  type BusinessGoals,
  type InsertBusinessGoals,
  type MessageThread,
  type Message,
  type Broadcast,
  type RewardAdjustment,
  type RewardContribution,
  type RewardSettlement,
  type BadgeDefinition,
  type BadgeAward,
  type PointReward,
  type PointRedemption,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, sql, count, inArray, isNull, isNotNull } from "drizzle-orm";
import { tierForPoints, levelForPoints, pointsToNextLevel } from "./gamification";
import { ADDON_CATALOG, isAddonIncludedInTier, resolveAddonAmountCents } from "./addons";
import { PLAN_PRICING } from "./pricing";

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
  getBusinessBySlug(slug: string): Promise<Business | undefined>;
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
  processTap(tap: InsertTap, opts?: { latitude?: number; longitude?: number }): Promise<{ success: boolean; reward?: Reward; pointsEarned?: number; message: string; reason?: string; groupProgress?: any[]; donations?: any[]; progress?: { count: number; goal: number; rewardEarned: boolean } }>;
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

// CHR-48: great-circle distance between two lat/lng points, in metres.
function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000; // Earth radius in metres
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// CHR-48/81: a no-account customer is matched by email and/or device
// fingerprint. Build the per-identity equality conditions for a table's
// (emailColumn, fingerprintColumn); callers combine them with or(...) and/or a
// length check. Centralizes the email-or-fingerprint pattern used across
// favorites, tap progress, and group-campaign progress.
function identityConds(
  emailColumn: any,
  fingerprintColumn: any,
  email?: string | null,
  deviceFingerprint?: string | null
): any[] {
  const conds: any[] = [];
  if (email) conds.push(eq(emailColumn, email));
  if (deviceFingerprint) conds.push(eq(fingerprintColumn, deviceFingerprint));
  return conds;
}

// CHR-32/61: coordinator revenue share. Owner decision (2026-07-02): 70/30
// coordinator/platform split on GROSS, applied to both subscriptions and add-ons.
// The per-coordinator `coordinators.share_pct` can override this default, but only
// within the admin-discretion band below (50–100).
const DEFAULT_COORDINATOR_SHARE_PCT = 70;
export const COORDINATOR_SHARE_MIN = 50;
export const COORDINATOR_SHARE_MAX = 100;

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

  // CHR-74: public reward lookup by redemption code (customer-facing).
  async getRewardByCode(code: string): Promise<Reward | undefined> {
    const [reward] = await db.select().from(rewards).where(eq(rewards.code, code));
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
      // CHR-81: aggregate today's taps in SQL instead of loading the user's taps.
      const [agg] = await db
        .select({
          c: sql<number>`count(*)`,
          pts: sql<number>`coalesce(sum(${taps.pointsEarned}), 0)`,
        })
        .from(taps)
        .where(and(eq(taps.customerEmail, email), sql`${taps.createdAt} >= ${dayStart}`));
      todayTaps = Number(agg?.c ?? 0);
      todayPoints = Number(agg?.pts ?? 0);
      const user = await this.getUserByEmail(email);
      if (user) {
        const userRewards = await this.getRewardsByUser(user.id);
        todayRedemptions = userRewards.filter(
          (r) => r.isRedeemed && r.redeemedAt && new Date(r.redeemedAt) >= dayStart
        ).length;
      }
    }

    // Participants: distinct customers active platform-wide today (CHR-81: a
    // single COUNT(DISTINCT) instead of loading the entire taps table).
    const [pRow] = await db
      .select({ n: sql<number>`count(distinct ${taps.customerEmail})` })
      .from(taps)
      .where(sql`${taps.createdAt} >= ${dayStart}`);
    const participants = Number(pRow?.n ?? 0);

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

  // Stripe Connect: update payout-readiness for the business owning a connected
  // account (used by the account.updated webhook — status flips asynchronously).
  async setBusinessConnectStatus(
    accountId: string,
    patch: { payoutsEnabled?: boolean; detailsSubmitted?: boolean },
  ): Promise<void> {
    await db
      .update(businesses)
      .set({
        ...(patch.payoutsEnabled !== undefined ? { connectPayoutsEnabled: patch.payoutsEnabled } : {}),
        ...(patch.detailsSubmitted !== undefined ? { connectDetailsSubmitted: patch.detailsSubmitted } : {}),
        ...(patch.payoutsEnabled ? { connectOnboardedAt: new Date() } : {}),
        updatedAt: new Date(),
      })
      .where(eq(businesses.stripeConnectAccountId, accountId));
  }

  // Hosted Business Page (add-on): resolve a business by its public website slug.
  async getBusinessBySlug(slug: string): Promise<Business | undefined> {
    const [business] = await db.select().from(businesses).where(eq(businesses.websiteSlug, slug));
    return business || undefined;
  }

  // CHR-70: active nonprofit (501c3) entities.
  async getNonprofits(): Promise<Business[]> {
    return await db
      .select()
      .from(businesses)
      .where(and(eq(businesses.isNonprofit, true), eq(businesses.isActive, true)));
  }

  async getBusinessesByOwner(ownerId: string): Promise<Business[]> {
    return await db.select().from(businesses).where(eq(businesses.ownerId, ownerId));
  }

  async getUserBusinesses(userId: string): Promise<Business[]> {
    return await db.select().from(businesses).where(eq(businesses.ownerId, userId));
  }

  // Real platform-wide counts + revenue for the admin dashboard (no mock).
  async getPlatformStats(): Promise<{
    totalUsers: number;
    activeBusinesses: number;
    activeCampaigns: number;
    totalRevenueCents: number;
  }> {
    const [[u], [b], [c], [rev]] = await Promise.all([
      db.select({ n: count() }).from(users),
      db.select({ n: count() }).from(businesses).where(eq(businesses.isActive, true)),
      db.select({ n: count() }).from(campaigns).where(eq(campaigns.isActive, true)),
      db.select({ sum: sql<number>`coalesce(sum(${coordinatorEarnings.grossAmountCents}), 0)` }).from(coordinatorEarnings),
    ]);
    return {
      totalUsers: Number(u?.n ?? 0),
      activeBusinesses: Number(b?.n ?? 0),
      activeCampaigns: Number(c?.n ?? 0),
      totalRevenueCents: Number(rev?.sum ?? 0),
    };
  }

  // Aggregate snapshot for the admin command center: headline KPIs plus a
  // "needs attention" queue (things that require an admin's action now).
  async getAdminOverview(): Promise<{
    kpis: {
      users: number; businesses: number; activeCampaigns: number; coordinators: number;
      territories: number; nonprofits: number; livePages: number; grossProcessedCents: number;
    };
    attention: {
      pendingAdminInvites: number; businessesAwaitingVerification: number;
      coordinatorsWithUnpaid: number; unpaidLiabilityCents: number;
    };
  }> {
    const [stats, terrRows, coords, nonprofits, awaitingRows, publishedRows, pendingInvRows, unpaidRows] =
      await Promise.all([
        this.getPlatformStats(),
        db.select({ n: count() }).from(territories),
        this.listCoordinators(),
        this.getNonprofits(),
        // Claimed businesses (real owner) still awaiting verification — the review queue.
        db.select({ n: count() }).from(businesses).where(
          and(eq(businesses.isActive, true), eq(businesses.verificationStatus, "unverified"), isNotNull(businesses.ownerId)),
        ),
        db.select({ n: count() }).from(businesses).where(eq(businesses.websitePublished, true)),
        db.select({ n: count() }).from(adminUsers).where(eq(adminUsers.isActive, false)),
        // Unpaid coordinator earnings = current payout liability.
        db.select({ coordinatorId: coordinatorEarnings.coordinatorId, shareAmountCents: coordinatorEarnings.shareAmountCents })
          .from(coordinatorEarnings).where(isNull(coordinatorEarnings.payoutId)),
      ]);
    const unpaidLiabilityCents = unpaidRows.reduce((s, r) => s + (r.shareAmountCents || 0), 0);
    const coordinatorsWithUnpaid = new Set(unpaidRows.map((r) => r.coordinatorId)).size;
    return {
      kpis: {
        users: stats.totalUsers,
        businesses: stats.activeBusinesses,
        activeCampaigns: stats.activeCampaigns,
        coordinators: coords.length,
        territories: Number(terrRows[0]?.n ?? 0),
        nonprofits: nonprofits.length,
        livePages: Number(publishedRows[0]?.n ?? 0),
        grossProcessedCents: stats.totalRevenueCents,
      },
      attention: {
        pendingAdminInvites: Number(pendingInvRows[0]?.n ?? 0),
        businessesAwaitingVerification: Number(awaitingRows[0]?.n ?? 0),
        coordinatorsWithUnpaid,
        unpaidLiabilityCents,
      },
    };
  }

  // Platform revenue snapshot for the admin Revenue tab: MRR (from active
  // subscriptions + paid add-ons), attach counts, coordinator payout liability,
  // trials expiring, lapsed subs, and this-month attributed gross/share.
  async getRevenueSummary(): Promise<{
    mrrCents: number; subscriptionMrrCents: number; addonMrrCents: number;
    subscriptions: { starter: number; core: number; pro: number };
    addonsByKey: Record<string, number>;
    coordinatorLiabilityCents: number; trialsExpiring30d: number; lapsedSubscriptions: number;
    thisMonth: { grossCents: number; shareCents: number; count: number };
  }> {
    const now = Date.now();
    const d = new Date();
    const currentMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const [subRows, addonRows, unpaidRows, trialRows, lapsedRows, monthRows] = await Promise.all([
      db.select({ tier: users.subscriptionTier, n: count() }).from(users)
        .where(eq(users.subscriptionStatus, "active")).groupBy(users.subscriptionTier),
      db.select({ addonKey: businessAddons.addonKey, expiresAt: businessAddons.expiresAt })
        .from(businessAddons).where(eq(businessAddons.status, "active")),
      db.select({ shareAmountCents: coordinatorEarnings.shareAmountCents })
        .from(coordinatorEarnings).where(isNull(coordinatorEarnings.payoutId)),
      db.select({ starterExpiresAt: users.starterExpiresAt }).from(users)
        .where(and(eq(users.subscriptionTier, "starter"), isNotNull(users.starterExpiresAt))),
      db.select({ n: count() }).from(users).where(inArray(users.subscriptionStatus, ["cancelled", "expired"])),
      db.select({ gross: coordinatorEarnings.grossAmountCents, share: coordinatorEarnings.shareAmountCents })
        .from(coordinatorEarnings).where(eq(coordinatorEarnings.periodMonth, currentMonth)),
    ]);

    const subscriptions = { starter: 0, core: 0, pro: 0 };
    for (const r of subRows) {
      const t = (r.tier || "starter") as keyof typeof subscriptions;
      if (t in subscriptions) subscriptions[t] += Number(r.n);
    }
    const subscriptionMrrCents = subscriptions.core * (PLAN_PRICING.core?.monthlyCents ?? 1999)
      + subscriptions.pro * (PLAN_PRICING.pro?.monthlyCents ?? 4999);

    const addonsByKey: Record<string, number> = {};
    let addonMrrCents = 0;
    for (const r of addonRows) {
      if (r.expiresAt && r.expiresAt.getTime() <= now) continue; // expired
      addonsByKey[r.addonKey] = (addonsByKey[r.addonKey] || 0) + 1;
      addonMrrCents += resolveAddonAmountCents(r.addonKey) ?? 0;
    }

    const coordinatorLiabilityCents = unpaidRows.reduce((s, r) => s + (r.shareAmountCents || 0), 0);
    const in30 = now + 30 * 24 * 60 * 60 * 1000;
    const trialsExpiring30d = trialRows.filter((r) => {
      const t = r.starterExpiresAt?.getTime();
      return t != null && t > now && t <= in30;
    }).length;
    const thisMonth = monthRows.reduce(
      (a, r) => ({ grossCents: a.grossCents + (r.gross || 0), shareCents: a.shareCents + (r.share || 0), count: a.count + 1 }),
      { grossCents: 0, shareCents: 0, count: 0 },
    );

    return {
      mrrCents: subscriptionMrrCents + addonMrrCents,
      subscriptionMrrCents, addonMrrCents, subscriptions, addonsByKey,
      coordinatorLiabilityCents, trialsExpiring30d, lapsedSubscriptions: Number(lapsedRows[0]?.n ?? 0),
      thisMonth,
    };
  }

  // Trust & Safety: claimed businesses (real owner) still awaiting verification.
  async getAdminVerificationQueue(): Promise<Array<{ id: string; name: string; address: string | null; ownerEmail: string | null; createdAt: Date | null }>> {
    return await db
      .select({ id: businesses.id, name: businesses.name, address: businesses.address, ownerEmail: users.email, createdAt: businesses.createdAt })
      .from(businesses)
      .leftJoin(users, eq(users.id, businesses.ownerId))
      .where(and(eq(businesses.isActive, true), eq(businesses.verificationStatus, "unverified"), isNotNull(businesses.ownerId)))
      .orderBy(desc(businesses.createdAt))
      .limit(100);
  }

  // Trust & Safety: all published hosted business pages (for moderation).
  async getAdminHostedPages(): Promise<Array<{ id: string; name: string; slug: string | null; views: number | null }>> {
    return await db
      .select({ id: businesses.id, name: businesses.name, slug: businesses.websiteSlug, views: businesses.websiteViews })
      .from(businesses)
      .where(eq(businesses.websitePublished, true))
      .orderBy(desc(businesses.websiteViews))
      .limit(200);
  }

  // Territories tab: coordinator leaderboard — businesses signed, verified,
  // lifetime share earned, and unpaid balance, ranked by earnings.
  async getCoordinatorLeaderboard(): Promise<Array<{
    id: string; name: string; email: string | null; sharePct: number;
    businesses: number; verified: number; lifetimeShareCents: number; unpaidCents: number;
  }>> {
    const coords = await this.listCoordinators();
    const rows = await Promise.all(coords.map(async (c) => {
      const [biz, earn] = await Promise.all([
        this.getBusinessesForCoordinator(c.id),
        this.getCoordinatorEarningsSummary(c.id),
      ]);
      const name = c.displayName || [c.firstName, c.lastName].filter(Boolean).join(" ") || c.email || "Coordinator";
      return {
        id: c.id, name, email: c.email, sharePct: c.sharePct,
        businesses: biz.length,
        verified: biz.filter((b: any) => b.verificationStatus === "verified").length,
        lifetimeShareCents: earn.lifetime.shareCents,
        unpaidCents: earn.unpaid.shareCents,
      };
    }));
    return rows.sort((a, b) => b.lifetimeShareCents - a.lifetimeShareCents);
  }

  // Admin Insights: 6-month growth trends (signups, new businesses, taps,
  // attributed revenue) + the business activation funnel (signed -> configured
  // -> live -> getting taps). Derived from existing timestamped data.
  async getAdminInsights(): Promise<{
    trends: Array<{ month: string; signups: number; businesses: number; taps: number; revenueCents: number }>;
    funnel: { signed: number; configured: number; live: number; active: number };
  }> {
    const now = new Date();
    const months: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    const monthOf = (col: any) => sql<string>`to_char(date_trunc('month', ${col}), 'YYYY-MM')`;
    const uM = monthOf(users.createdAt), bM = monthOf(businesses.createdAt), tM = monthOf(taps.createdAt);

    const [signupRows, bizRows, tapRows, revRows, claimed, campBiz, tagBiz, tapBiz] = await Promise.all([
      db.select({ m: uM, n: count() }).from(users).groupBy(uM),
      db.select({ m: bM, n: count() }).from(businesses).groupBy(bM),
      db.select({ m: tM, n: count() }).from(taps).groupBy(tM),
      db.select({ m: coordinatorEarnings.periodMonth, g: sql<number>`coalesce(sum(${coordinatorEarnings.grossAmountCents}),0)` })
        .from(coordinatorEarnings).groupBy(coordinatorEarnings.periodMonth),
      db.select({ id: businesses.id }).from(businesses).where(and(eq(businesses.isActive, true), isNotNull(businesses.ownerId))),
      db.select({ b: campaigns.businessId }).from(campaigns).groupBy(campaigns.businessId),
      db.select({ b: nfcTags.businessId }).from(nfcTags).groupBy(nfcTags.businessId),
      db.select({ b: taps.businessId }).from(taps).groupBy(taps.businessId),
    ]);

    const map = (rows: Array<{ m: string | null; n?: number; g?: number }>, key: "n" | "g") =>
      new Map(rows.filter((r) => r.m).map((r) => [r.m as string, Number(r[key] ?? 0)]));
    const s = map(signupRows, "n"), b = map(bizRows, "n"), t = map(tapRows, "n"), r = map(revRows, "g");
    const trends = months.map((m) => ({
      month: m, signups: s.get(m) ?? 0, businesses: b.get(m) ?? 0, taps: t.get(m) ?? 0, revenueCents: r.get(m) ?? 0,
    }));

    const claimedIds = new Set(claimed.map((x) => x.id));
    const withCampaign = new Set(campBiz.map((x) => x.b));
    const withTag = new Set(tagBiz.map((x) => x.b));
    const withTap = new Set(tapBiz.map((x) => x.b));
    const inClaimed = (set: Set<string>) => Array.from(claimedIds).filter((id) => set.has(id)).length;
    const funnel = {
      signed: claimedIds.size,
      configured: inClaimed(withCampaign),
      live: inClaimed(withTag),
      active: inClaimed(withTap),
    };

    return { trends, funnel };
  }

  // Retention watch: claimed businesses that need an admin's attention —
  // dormant (were active, now silent), never activated (signed up, never got a
  // tap), or on a trial ending soon. A proactive worklist, not a churn count.
  async getAtRiskBusinesses(): Promise<Array<{
    id: string; name: string; ownerEmail: string | null;
    signedUpAt: Date | null; lastTapAt: Date | null; totalTaps: number;
    flags: Array<{ reason: string; detail: string; severity: "high" | "medium" }>;
  }>> {
    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;
    const [bizRows, tapAgg] = await Promise.all([
      db.select({
        id: businesses.id, name: businesses.name, createdAt: businesses.createdAt,
        ownerEmail: users.email, tier: users.subscriptionTier, trialEnds: users.starterExpiresAt,
      }).from(businesses).leftJoin(users, eq(users.id, businesses.ownerId))
        .where(and(eq(businesses.isActive, true), isNotNull(businesses.ownerId))),
      db.select({ b: taps.businessId, last: sql<string>`max(${taps.createdAt})`, n: count() })
        .from(taps).groupBy(taps.businessId),
    ]);
    const tapMap = new Map(tapAgg.map((r) => [r.b, { last: r.last ? new Date(r.last) : null, n: Number(r.n) }]));
    const daysAgo = (d: Date) => Math.floor((now - d.getTime()) / DAY);

    const out = bizRows.map((b) => {
      const tap = tapMap.get(b.id);
      const totalTaps = tap?.n ?? 0;
      const lastTapAt = tap?.last ?? null;
      const signedUpAt = b.createdAt ?? null;
      const flags: Array<{ reason: string; detail: string; severity: "high" | "medium" }> = [];

      if (totalTaps > 0 && lastTapAt && now - lastTapAt.getTime() > 30 * DAY) {
        flags.push({ reason: "Dormant", detail: `No taps in ${daysAgo(lastTapAt)} days`, severity: "high" });
      } else if (totalTaps === 0 && signedUpAt && now - signedUpAt.getTime() > 7 * DAY) {
        flags.push({ reason: "Never activated", detail: `Signed up ${daysAgo(signedUpAt)}d ago, no taps yet`, severity: "medium" });
      }
      if (b.tier === "starter" && b.trialEnds) {
        const dLeft = Math.ceil((b.trialEnds.getTime() - now) / DAY);
        if (dLeft > 0 && dLeft <= 30) flags.push({ reason: "Trial ending", detail: `Trial ends in ${dLeft}d`, severity: "medium" });
      }
      return { id: b.id, name: b.name, ownerEmail: b.ownerEmail, signedUpAt, lastTapAt, totalTaps, flags };
    }).filter((b) => b.flags.length > 0);

    const rank = (b: { flags: Array<{ severity: string }> }) =>
      (b.flags.some((f) => f.severity === "high") ? 100 : 0) + b.flags.length;
    return out.sort((a, b) => rank(b) - rank(a));
  }

  // Admin geographic view: business points (for a heatmap weighted by taps) +
  // a per-territory coverage breakdown (businesses, taps, coordinator).
  async getAdminGeo(): Promise<{
    points: Array<{ lat: number; lng: number; name: string; claimed: boolean; taps: number }>;
    regions: Array<{ name: string; city: string | null; state: string | null; coordinator: string | null; businesses: number; taps: number }>;
  }> {
    const [coordBiz, allBiz, tapAgg, terrRows, coords] = await Promise.all([
      db.select({ id: businesses.id, name: businesses.name, lat: businesses.latitude, lng: businesses.longitude, ownerId: businesses.ownerId })
        .from(businesses).where(and(eq(businesses.isActive, true), isNotNull(businesses.latitude), isNotNull(businesses.longitude))),
      db.select({ id: businesses.id, territoryId: businesses.territoryId }).from(businesses).where(eq(businesses.isActive, true)),
      db.select({ b: taps.businessId, n: count() }).from(taps).groupBy(taps.businessId),
      db.select({ id: territories.id, name: territories.name, city: territories.city, state: territories.state, coordinatorId: territories.coordinatorId }).from(territories),
      this.listCoordinators(),
    ]);
    const tapMap = new Map(tapAgg.map((r) => [r.b, Number(r.n)]));
    const coordName = new Map(coords.map((c) => [c.id, c.displayName || [c.firstName, c.lastName].filter(Boolean).join(" ") || c.email]));

    const points = coordBiz.map((b) => ({
      lat: b.lat as number, lng: b.lng as number, name: b.name, claimed: !!b.ownerId, taps: tapMap.get(b.id) ?? 0,
    }));

    const agg = new Map<string, { businesses: number; taps: number }>();
    for (const b of allBiz) {
      const key = b.territoryId || "__unassigned";
      const cur = agg.get(key) || { businesses: 0, taps: 0 };
      cur.businesses++; cur.taps += tapMap.get(b.id) ?? 0;
      agg.set(key, cur);
    }
    const regions = terrRows.map((t) => ({
      name: t.name, city: t.city, state: t.state,
      coordinator: t.coordinatorId ? (coordName.get(t.coordinatorId) ?? null) : null,
      businesses: agg.get(t.id)?.businesses ?? 0, taps: agg.get(t.id)?.taps ?? 0,
    }));
    const un = agg.get("__unassigned");
    if (un && un.businesses > 0) regions.push({ name: "Unassigned", city: null, state: null, coordinator: null, businesses: un.businesses, taps: un.taps });
    regions.sort((a, b) => b.businesses - a.businesses);

    return { points, regions };
  }

  // Customer-side health: is the tap-to-earn flywheel spinning? Redemption rate
  // (are rewards compelling?), repeat-customer rate (do they come back?), active
  // customers, and the top customers. Derived from taps + rewards.
  async getCustomerHealth(): Promise<{
    rewardsIssued: number; rewardsRedeemed: number; redemptionRate: number;
    customers: number; repeatCustomers: number; repeatRate: number;
    totalTaps: number; avgTapsPerCustomer: number; activeLast30d: number;
    topCustomers: Array<{ email: string; taps: number; points: number }>;
  }> {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const [totalTapsRow, custRows, rewTotal, rewRedeemed] = await Promise.all([
      db.select({ n: count() }).from(taps),
      db.select({
        email: taps.customerEmail, taps: count(),
        points: sql<number>`coalesce(sum(${taps.pointsEarned}),0)`,
        last: sql<string>`max(${taps.createdAt})`,
      }).from(taps).groupBy(taps.customerEmail),
      db.select({ n: count() }).from(rewards),
      db.select({ n: count() }).from(rewards).where(eq(rewards.isRedeemed, true)),
    ]);

    const customers = custRows.length;
    const repeatCustomers = custRows.filter((r) => Number(r.taps) > 1).length;
    const totalTaps = Number(totalTapsRow[0]?.n ?? 0);
    const activeLast30d = custRows.filter((r) => r.last && new Date(r.last).getTime() >= cutoff).length;
    const rewardsIssued = Number(rewTotal[0]?.n ?? 0);
    const rewardsRedeemed = Number(rewRedeemed[0]?.n ?? 0);
    const topCustomers = custRows
      .map((r) => ({ email: r.email, taps: Number(r.taps), points: Number(r.points) }))
      .sort((a, b) => b.taps - a.taps)
      .slice(0, 10);

    return {
      rewardsIssued, rewardsRedeemed,
      redemptionRate: rewardsIssued > 0 ? rewardsRedeemed / rewardsIssued : 0,
      customers, repeatCustomers,
      repeatRate: customers > 0 ? repeatCustomers / customers : 0,
      totalTaps, avgTapsPerCustomer: customers > 0 ? totalTaps / customers : 0,
      activeLast30d, topCustomers,
    };
  }

  // Support 360: a full picture of one user for admin support — profile, role
  // flags, and each of their businesses with key stats.
  async getUserDetail(userId: string): Promise<null | {
    user: { id: string; email: string | null; firstName: string | null; lastName: string | null; role: string | null; subscriptionTier: string | null; subscriptionStatus: string | null; createdAt: Date | null; suspended: boolean };
    isAdmin: boolean; isCoordinator: boolean;
    businesses: Array<{ id: string; name: string; verificationStatus: string | null; websitePublished: boolean; websiteSlug: string | null; campaigns: number; tags: number; taps: number; lastTap: Date | null }>;
  }> {
    const user = await this.getUser(userId);
    if (!user) return null;
    const [[adminRow], coord, bizs] = await Promise.all([
      db.select({ id: adminUsers.id }).from(adminUsers).where(eq(adminUsers.userId, userId)),
      this.getCoordinatorByUserId(userId),
      this.getBusinessesByOwner(userId),
    ]);
    const businesses = await Promise.all(bizs.map(async (b) => {
      const [[c], [t], [tp]] = await Promise.all([
        db.select({ n: count() }).from(campaigns).where(eq(campaigns.businessId, b.id)),
        db.select({ n: count() }).from(nfcTags).where(eq(nfcTags.businessId, b.id)),
        db.select({ n: count(), last: sql<string>`max(${taps.createdAt})` }).from(taps).where(eq(taps.businessId, b.id)),
      ]);
      return {
        id: b.id, name: b.name, verificationStatus: b.verificationStatus,
        websitePublished: !!b.websitePublished, websiteSlug: b.websiteSlug ?? null,
        campaigns: Number(c?.n ?? 0), tags: Number(t?.n ?? 0), taps: Number(tp?.n ?? 0),
        lastTap: tp?.last ? new Date(tp.last) : null,
      };
    }));
    return {
      user: {
        id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName,
        role: user.role, subscriptionTier: user.subscriptionTier, subscriptionStatus: user.subscriptionStatus, createdAt: user.createdAt,
        suspended: !!(user as any).suspended,
      },
      isAdmin: !!adminRow, isCoordinator: !!coord, businesses,
    };
  }

  // Suspend / unsuspend a user account (blocks login + active sessions).
  async setUserSuspended(userId: string, suspended: boolean, reason?: string | null): Promise<void> {
    await db.update(users).set({
      suspended,
      suspendedAt: suspended ? new Date() : null,
      suspendedReason: suspended ? (reason ?? null) : null,
    } as any).where(eq(users.id, userId));
  }

  // Admin audit log — record a privileged action, and read recent entries.
  async logAdminAction(entry: { adminUserId?: string | null; adminEmail?: string | null; action: string; targetType?: string | null; targetId?: string | null; detail?: string | null }): Promise<void> {
    try {
      await db.insert(adminAudit).values({
        adminUserId: entry.adminUserId ?? null,
        adminEmail: entry.adminEmail ?? null,
        action: entry.action,
        targetType: entry.targetType ?? null,
        targetId: entry.targetId ?? null,
        detail: entry.detail ?? null,
      });
    } catch (e) {
      console.error("audit log failed:", e); // never let auditing break the action
    }
  }

  async getAdminAudit(limit = 100): Promise<Array<{ id: string; adminEmail: string | null; action: string; targetType: string | null; targetId: string | null; detail: string | null; createdAt: Date | null }>> {
    return await db.select({
      id: adminAudit.id, adminEmail: adminAudit.adminEmail, action: adminAudit.action,
      targetType: adminAudit.targetType, targetId: adminAudit.targetId, detail: adminAudit.detail, createdAt: adminAudit.createdAt,
    }).from(adminAudit).orderBy(desc(adminAudit.createdAt)).limit(limit);
  }

  // Real list of platform users for the admin user-management table.
  async listPlatformUsers(limit = 200): Promise<
    Array<Pick<User, "id" | "email" | "firstName" | "lastName" | "role" | "subscriptionTier" | "subscriptionStatus" | "createdAt">>
  > {
    return await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        subscriptionTier: users.subscriptionTier,
        subscriptionStatus: users.subscriptionStatus,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(limit);
  }

  async createBusiness(business: InsertBusiness): Promise<Business> {
    const [newBusiness] = await db.insert(businesses).values(business).returning();
    return newBusiness;
  }

  async deleteBusiness(id: string): Promise<boolean> {
    await db.delete(businesses).where(eq(businesses.id, id));
    return true;
  }

  async updateBusiness(id: string, updates: Partial<Business>): Promise<Business> {
    const [business] = await db
      .update(businesses)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(businesses.id, id))
      .returning();
    return business;
  }

  // CHR-31 (CHR-50): coordinator / territory model + territory-scoped businesses.
  async createCoordinator(data: InsertCoordinator): Promise<Coordinator> {
    const [row] = await db.insert(coordinators).values(data).returning();
    return row;
  }

  async getCoordinator(id: string): Promise<Coordinator | undefined> {
    const [row] = await db.select().from(coordinators).where(eq(coordinators.id, id));
    return row || undefined;
  }

  async getCoordinatorByUserId(userId: string): Promise<Coordinator | undefined> {
    const [row] = await db.select().from(coordinators).where(eq(coordinators.userId, userId));
    return row || undefined;
  }

  // CHR-32: all coordinators (with their user email/name) for the admin dashboard.
  async listCoordinators(): Promise<any[]> {
    return await db
      .select({
        id: coordinators.id,
        userId: coordinators.userId,
        displayName: coordinators.displayName,
        sharePct: coordinators.sharePct,
        planStatus: coordinators.planStatus,
        isActive: coordinators.isActive,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(coordinators)
      .innerJoin(users, eq(users.id, coordinators.userId))
      .orderBy(desc(coordinators.createdAt));
  }

  // CHR-32: admin sets a coordinator's revenue-share %. Band-validated by the
  // caller (COORDINATOR_SHARE_MIN..MAX). Applies to all future earnings.
  async updateCoordinatorSharePct(id: string, sharePct: number): Promise<Coordinator | undefined> {
    const [row] = await db
      .update(coordinators)
      .set({ sharePct, updatedAt: new Date() })
      .where(eq(coordinators.id, id))
      .returning();
    return row || undefined;
  }

  async createTerritory(data: InsertTerritory): Promise<Territory> {
    const [row] = await db.insert(territories).values(data).returning();
    return row;
  }

  // ── Admin territory manager (circular territories) ──

  // Everything the manager + coverage map needs: territories (with coordinator
  // + business count), business points, circle overlaps, and the unassigned/
  // contested/no-coverage summary.
  async getTerritoryManager(): Promise<{
    territories: Array<{ id: string; name: string; coordinatorId: string; coordinatorName: string | null; centerLat: number | null; centerLng: number | null; radiusMeters: number | null; welcomeMessage: string | null; isActive: boolean; businesses: number }>;
    coordinators: Array<{ id: string; name: string }>;
    points: Array<{ id: string; name: string; lat: number; lng: number; territoryId: string | null; claimed: boolean }>;
    overlaps: Array<{ a: string; b: string }>;
    summary: { unassigned: number; contested: number; noCoverage: number };
  }> {
    const [terrs, coords, biz] = await Promise.all([
      db.select().from(territories),
      this.listCoordinators(),
      db.select({ id: businesses.id, name: businesses.name, lat: businesses.latitude, lng: businesses.longitude, territoryId: businesses.territoryId, ownerId: businesses.ownerId })
        .from(businesses).where(eq(businesses.isActive, true)),
    ]);
    const coordName = new Map(coords.map((c) => [c.id, c.displayName || [c.firstName, c.lastName].filter(Boolean).join(" ") || c.email || "Coordinator"]));
    const countByTerr = new Map<string, number>();
    for (const b of biz) if (b.territoryId) countByTerr.set(b.territoryId, (countByTerr.get(b.territoryId) || 0) + 1);

    const circles = terrs.filter((t) => t.isActive && t.centerLat != null && t.centerLng != null && t.radiusMeters != null);
    let unassigned = 0, contested = 0, noCoverage = 0;
    for (const b of biz) {
      if (b.territoryId) continue;
      unassigned++;
      if (b.lat == null || b.lng == null) { noCoverage++; continue; }
      const n = circles.filter((t) => haversineMeters(b.lat!, b.lng!, t.centerLat!, t.centerLng!) <= t.radiusMeters!).length;
      if (n > 1) contested++; else if (n === 0) noCoverage++;
    }
    const overlaps: Array<{ a: string; b: string }> = [];
    for (let i = 0; i < circles.length; i++) for (let j = i + 1; j < circles.length; j++) {
      const A = circles[i], B = circles[j];
      if (haversineMeters(A.centerLat!, A.centerLng!, B.centerLat!, B.centerLng!) < (A.radiusMeters! + B.radiusMeters!)) overlaps.push({ a: A.id, b: B.id });
    }

    return {
      territories: terrs.map((t) => ({
        id: t.id, name: t.name, coordinatorId: t.coordinatorId, coordinatorName: coordName.get(t.coordinatorId) ?? null,
        centerLat: t.centerLat, centerLng: t.centerLng, radiusMeters: t.radiusMeters, welcomeMessage: t.welcomeMessage, isActive: !!t.isActive,
        businesses: countByTerr.get(t.id) ?? 0,
      })),
      coordinators: coords.map((c) => ({ id: c.id, name: coordName.get(c.id) ?? "Coordinator" })),
      points: biz.filter((b) => b.lat != null && b.lng != null).map((b) => ({ id: b.id, name: b.name, lat: b.lat as number, lng: b.lng as number, territoryId: b.territoryId ?? null, claimed: !!b.ownerId })),
      overlaps,
      summary: { unassigned, contested, noCoverage },
    };
  }

  // Delete a territory — unassigns its businesses first (never orphan a FK).
  async deleteTerritory(id: string): Promise<void> {
    await db.update(businesses).set({ territoryId: null }).where(eq(businesses.territoryId, id));
    await db.delete(territories).where(eq(territories.id, id));
  }

  async setBusinessTerritory(businessId: string, territoryId: string | null): Promise<void> {
    await db.update(businesses).set({ territoryId }).where(eq(businesses.id, businessId));
  }

  // Auto-assign unassigned businesses to the single active territory whose circle
  // contains them. In 0 circles → left unassigned; in >1 → counted as contested.
  async autoAssignTerritories(): Promise<{ assigned: number; contested: number }> {
    const [terrs, biz] = await Promise.all([
      db.select().from(territories).where(eq(territories.isActive, true)),
      db.select({ id: businesses.id, lat: businesses.latitude, lng: businesses.longitude })
        .from(businesses).where(and(eq(businesses.isActive, true), isNull(businesses.territoryId))),
    ]);
    const circles = terrs.filter((t) => t.centerLat != null && t.centerLng != null && t.radiusMeters != null);
    let contested = 0;
    const toAssign: Array<{ id: string; territoryId: string }> = [];
    for (const b of biz) {
      if (b.lat == null || b.lng == null) continue;
      const matches = circles.filter((t) => haversineMeters(b.lat!, b.lng!, t.centerLat!, t.centerLng!) <= t.radiusMeters!);
      if (matches.length === 1) toAssign.push({ id: b.id, territoryId: matches[0].id });
      else if (matches.length > 1) contested++;
    }
    for (const a of toAssign) await db.update(businesses).set({ territoryId: a.territoryId }).where(eq(businesses.id, a.id));
    return { assigned: toAssign.length, contested };
  }

  async getTerritoriesByCoordinator(coordinatorId: string): Promise<Territory[]> {
    return await db.select().from(territories).where(eq(territories.coordinatorId, coordinatorId));
  }

  async getBusinessesByTerritory(territoryId: string): Promise<Business[]> {
    return await db.select().from(businesses).where(eq(businesses.territoryId, territoryId));
  }

  // CHR-52: real territory-scoped overview for a coordinator — totals + per-store
  // engagement across every business in the coordinator's territories. All data
  // is derived from taps/rewards (no random/hardcoded values).
  async getTerritoryOverview(coordinatorId: string): Promise<any> {
    const territoriesOwned = await this.getTerritoriesByCoordinator(coordinatorId);
    const territoryIds = territoriesOwned.map((t) => t.id);

    const bizRows = territoryIds.length
      ? await db.select().from(businesses).where(inArray(businesses.territoryId, territoryIds))
      : [];
    const businessIds = bizRows.map((b) => b.id);

    if (businessIds.length === 0) {
      return {
        territories: territoriesOwned,
        totals: {
          businesses: 0,
          verifiedBusinesses: 0,
          totalTaps: 0,
          activeCustomers: 0,
          rewardsIssued: 0,
          rewardsRedeemed: 0,
          pointsAwarded: 0,
        },
        stores: [],
      };
    }

    const tapRows = await db.select().from(taps).where(inArray(taps.businessId, businessIds));
    const rewardRows = await db.select().from(rewards).where(inArray(rewards.businessId, businessIds));

    const totals = {
      businesses: bizRows.length,
      verifiedBusinesses: bizRows.filter((b) => b.verificationStatus === "verified").length,
      totalTaps: tapRows.length,
      activeCustomers: new Set(tapRows.map((t) => t.customerEmail).filter(Boolean)).size,
      rewardsIssued: rewardRows.length,
      rewardsRedeemed: rewardRows.filter((r) => r.isRedeemed).length,
      pointsAwarded: tapRows.reduce((s, t) => s + (t.pointsEarned ?? 0), 0),
    };

    const stores = bizRows
      .map((b) => {
        const bt = tapRows.filter((t) => t.businessId === b.id);
        const br = rewardRows.filter((r) => r.businessId === b.id);
        return {
          id: b.id,
          name: b.name,
          verificationStatus: b.verificationStatus ?? "unverified",
          isFeatured: b.isFeatured ?? false, // CHR-54
          latitude: b.latitude,
          longitude: b.longitude,
          // Category + claim state so coordinators can review/cull sales prospects.
          category: (b.establishmentType && b.establishmentType[0]) || null,
          address: b.address ?? null,
          claimed: b.ownerId != null,
          taps: bt.length,
          customers: new Set(bt.map((t) => t.customerEmail).filter(Boolean)).size,
          rewardsIssued: br.length,
          rewardsRedeemed: br.filter((r) => r.isRedeemed).length,
        };
      })
      .sort((a, b) => b.taps - a.taps);

    return { territories: territoriesOwned, totals, stores };
  }

  async assignBusinessToTerritory(businessId: string, territoryId: string | null): Promise<Business> {
    const [business] = await db
      .update(businesses)
      .set({ territoryId, updatedAt: new Date() })
      .where(eq(businesses.id, businessId))
      .returning();
    return business;
  }

  // CHR-53: all businesses across the coordinator's territories (for management).
  async getBusinessesForCoordinator(coordinatorId: string): Promise<Business[]> {
    const owned = await this.getTerritoriesByCoordinator(coordinatorId);
    const ids = owned.map((t) => t.id);
    if (ids.length === 0) return [];
    return await db.select().from(businesses).where(inArray(businesses.territoryId, ids));
  }

  // CHR-53: authorization — does this coordinator own the given territory / business?
  async coordinatorOwnsTerritory(coordinatorId: string, territoryId: string): Promise<boolean> {
    const owned = await this.getTerritoriesByCoordinator(coordinatorId);
    return owned.some((t) => t.id === territoryId);
  }

  async coordinatorOwnsBusiness(coordinatorId: string, businessId: string): Promise<boolean> {
    const business = await this.getBusiness(businessId);
    if (!business?.territoryId) return false;
    return this.coordinatorOwnsTerritory(coordinatorId, business.territoryId);
  }

  // CHR-55: regional settings + discount/trial offers.
  async updateTerritory(id: string, updates: Partial<Territory>): Promise<Territory> {
    const [row] = await db
      .update(territories)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(territories.id, id))
      .returning();
    return row;
  }

  async createRegionalOffer(data: InsertRegionalOffer): Promise<RegionalOffer> {
    const [row] = await db.insert(regionalOffers).values(data).returning();
    return row;
  }

  async getRegionalOffersByCoordinator(coordinatorId: string): Promise<RegionalOffer[]> {
    return await db
      .select()
      .from(regionalOffers)
      .where(eq(regionalOffers.coordinatorId, coordinatorId))
      .orderBy(desc(regionalOffers.createdAt));
  }

  // ── CHR-32 / CHR-61: coordinator revenue-share attribution ──

  // Resolve a paying user to the coordinator who earns on that charge: the
  // payer's business → its territory → the (active) coordinator. Null if the
  // payer has no territory-assigned business or no active coordinator.
  async resolveCoordinatorForPayer(
    userId: string
  ): Promise<{ coordinator: Coordinator; territoryId: string; businessId: string } | null> {
    const owned = await this.getBusinessesByOwner(userId);
    const biz = owned.find((b) => b.territoryId);
    if (!biz?.territoryId) return null;
    const [terr] = await db.select().from(territories).where(eq(territories.id, biz.territoryId));
    if (!terr) return null;
    const coordinator = await this.getCoordinator(terr.coordinatorId);
    if (!coordinator || coordinator.isActive === false) return null;
    return { coordinator, territoryId: terr.id, businessId: biz.id };
  }

  // Record one verified charge as coordinator earnings. Idempotent on the Stripe
  // payment-intent id (webhook retries never double-record). Returns null when
  // there is no coordinator to attribute the charge to (recorded nothing).
  async recordCoordinatorEarning(input: {
    paymentIntentId?: string;
    userId?: string;
    planId?: string;
    source?: string;
    description?: string;
    grossAmountCents: number;
    currency?: string;
    coordinatorId?: string;
    territoryId?: string;
    businessId?: string;
  }): Promise<CoordinatorEarning | null> {
    // Idempotency: a charge we've already recorded returns the existing row.
    if (input.paymentIntentId) {
      const [existing] = await db
        .select()
        .from(coordinatorEarnings)
        .where(eq(coordinatorEarnings.stripePaymentIntentId, input.paymentIntentId));
      if (existing) return existing;
    }

    let { coordinatorId, territoryId, businessId } = input;
    let sharePct = DEFAULT_COORDINATOR_SHARE_PCT;
    if (!coordinatorId) {
      if (!input.userId) return null;
      const resolved = await this.resolveCoordinatorForPayer(input.userId);
      if (!resolved) return null; // no coordinator → nothing to attribute
      coordinatorId = resolved.coordinator.id;
      territoryId = resolved.territoryId;
      businessId = resolved.businessId;
      sharePct = resolved.coordinator.sharePct ?? DEFAULT_COORDINATOR_SHARE_PCT;
    } else {
      const coord = await this.getCoordinator(coordinatorId);
      sharePct = coord?.sharePct ?? DEFAULT_COORDINATOR_SHARE_PCT;
    }

    const gross = Math.round(input.grossAmountCents);
    const shareAmountCents = Math.round((gross * sharePct) / 100);
    const now = new Date();
    const periodMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    try {
      const [row] = await db
        .insert(coordinatorEarnings)
        .values({
          coordinatorId,
          territoryId: territoryId ?? null,
          businessId: businessId ?? null,
          userId: input.userId ?? null,
          source: input.source || "subscription",
          planId: input.planId ?? null,
          description: input.description ?? null,
          grossAmountCents: gross,
          sharePct,
          shareAmountCents,
          currency: input.currency || "usd",
          stripePaymentIntentId: input.paymentIntentId ?? null,
          periodMonth,
        })
        .returning();
      return row;
    } catch (e: any) {
      // Concurrent webhook delivery raced us to the unique payment-intent id.
      if (e?.code === "23505" && input.paymentIntentId) {
        const [existing] = await db
          .select()
          .from(coordinatorEarnings)
          .where(eq(coordinatorEarnings.stripePaymentIntentId, input.paymentIntentId));
        if (existing) return existing;
      }
      throw e;
    }
  }

  // ── CHR-62: coordinator earnings aggregation ──

  // Itemized earnings for a coordinator, optionally for one YYYY-MM period.
  async getCoordinatorEarnings(
    coordinatorId: string,
    opts?: { month?: string }
  ): Promise<CoordinatorEarning[]> {
    const conds = [eq(coordinatorEarnings.coordinatorId, coordinatorId)];
    if (opts?.month) conds.push(eq(coordinatorEarnings.periodMonth, opts.month));
    return await db
      .select()
      .from(coordinatorEarnings)
      .where(and(...conds))
      .orderBy(desc(coordinatorEarnings.createdAt));
  }

  // Lifetime / current-month / trailing-12-month income + share, split by
  // source, with a 12-month series and a recent-charge breakdown. All server-
  // computed from stored rows; clean zeros when there are none.
  async getCoordinatorEarningsSummary(coordinatorId: string): Promise<any> {
    const rows = await db
      .select()
      .from(coordinatorEarnings)
      .where(eq(coordinatorEarnings.coordinatorId, coordinatorId));
    const coord = await this.getCoordinator(coordinatorId);

    const now = new Date();
    const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const currentMonth = monthKey(now);
    const last12: string[] = [];
    for (let i = 11; i >= 0; i--) {
      last12.push(monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)));
    }
    const last12Set = new Set(last12);

    const tally = (arr: CoordinatorEarning[]) =>
      arr.reduce(
        (a, r) => ({
          grossCents: a.grossCents + (r.grossAmountCents || 0),
          shareCents: a.shareCents + (r.shareAmountCents || 0),
          count: a.count + 1,
        }),
        { grossCents: 0, shareCents: 0, count: 0 }
      );

    const bySource = (src: string) =>
      tally(rows.filter((r) => (r.source || "subscription") === src));

    const monthly = last12.map((m) => ({
      month: m,
      ...tally(rows.filter((r) => r.periodMonth === m)),
    }));

    const recent = [...rows]
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
      .slice(0, 10)
      .map((r) => ({
        id: r.id,
        createdAt: r.createdAt,
        source: r.source,
        planId: r.planId,
        description: r.description,
        grossCents: r.grossAmountCents,
        sharePct: r.sharePct,
        shareCents: r.shareAmountCents,
        periodMonth: r.periodMonth,
        businessId: r.businessId,
      }));

    return {
      currency: rows[0]?.currency || "usd",
      sharePct: coord?.sharePct ?? DEFAULT_COORDINATOR_SHARE_PCT,
      lifetime: tally(rows),
      currentMonth: { month: currentMonth, ...tally(rows.filter((r) => r.periodMonth === currentMonth)) },
      trailing12Months: tally(rows.filter((r) => r.periodMonth && last12Set.has(r.periodMonth))),
      // CHR-64: not-yet-paid earnings (no payout linked) = the next pending payout.
      unpaid: tally(rows.filter((r) => !r.payoutId)),
      bySource: { subscription: bySource("subscription"), addon: bySource("addon") },
      monthly,
      recent,
    };
  }

  // ── CHR-64: coordinator payouts (reporting-only) ──

  // Roll a coordinator's UNPAID earnings for a period into a pending payout and
  // link them so they aren't re-counted. Null when there's nothing unpaid.
  async generateCoordinatorPayout(
    coordinatorId: string,
    periodMonth?: string
  ): Promise<CoordinatorPayout | null> {
    const conds = [
      eq(coordinatorEarnings.coordinatorId, coordinatorId),
      isNull(coordinatorEarnings.payoutId),
    ];
    if (periodMonth) conds.push(eq(coordinatorEarnings.periodMonth, periodMonth));
    const unpaid = await db.select().from(coordinatorEarnings).where(and(...conds));
    if (unpaid.length === 0) return null;

    const total = unpaid.reduce((s, r) => s + (r.shareAmountCents || 0), 0);
    const [payout] = await db
      .insert(coordinatorPayouts)
      .values({
        coordinatorId,
        periodMonth: periodMonth ?? null,
        totalShareCents: total,
        currency: unpaid[0].currency || "usd",
        status: "pending",
        method: "manual",
      })
      .returning();

    await db
      .update(coordinatorEarnings)
      .set({ payoutId: payout.id })
      .where(inArray(coordinatorEarnings.id, unpaid.map((r) => r.id)));

    return payout;
  }

  async getCoordinatorPayout(id: string): Promise<CoordinatorPayout | undefined> {
    const [row] = await db.select().from(coordinatorPayouts).where(eq(coordinatorPayouts.id, id));
    return row || undefined;
  }

  async getCoordinatorPayouts(coordinatorId: string): Promise<CoordinatorPayout[]> {
    return await db
      .select()
      .from(coordinatorPayouts)
      .where(eq(coordinatorPayouts.coordinatorId, coordinatorId))
      .orderBy(desc(coordinatorPayouts.createdAt));
  }

  // Mark a payout paid (reporting-only). Voiding a payout releases its earnings.
  async updateCoordinatorPayout(
    id: string,
    updates: { status?: string; reference?: string; notes?: string }
  ): Promise<CoordinatorPayout> {
    const set: Record<string, unknown> = { updatedAt: new Date() };
    if (updates.reference !== undefined) set.reference = updates.reference;
    if (updates.notes !== undefined) set.notes = updates.notes;
    if (updates.status) {
      set.status = updates.status;
      set.paidAt = updates.status === "paid" ? new Date() : null;
    }
    const [row] = await db
      .update(coordinatorPayouts)
      .set(set)
      .where(eq(coordinatorPayouts.id, id))
      .returning();
    // Voiding frees the earnings to be re-paid later.
    if (updates.status === "void") {
      await db
        .update(coordinatorEarnings)
        .set({ payoutId: null })
        .where(eq(coordinatorEarnings.payoutId, id));
    }
    return row;
  }

  // ── CHR-35 / CHR-65: per-business add-on entitlements ──

  // Active (non-expired) add-on entitlements for a business.
  async getBusinessAddons(businessId: string): Promise<BusinessAddon[]> {
    const rows = await db
      .select()
      .from(businessAddons)
      .where(and(eq(businessAddons.businessId, businessId), eq(businessAddons.status, "active")));
    const nowMs = Date.now();
    return rows.filter((r) => !r.expiresAt || r.expiresAt.getTime() > nowMs);
  }

  // CHR-66: the set of business ids currently holding a given add-on (active,
  // non-expired) — for bulk gating like the discovery map.
  async getBusinessIdsWithAddon(addonKey: string): Promise<Set<string>> {
    const rows = await db
      .select()
      .from(businessAddons)
      .where(and(eq(businessAddons.addonKey, addonKey), eq(businessAddons.status, "active")));
    const nowMs = Date.now();
    return new Set(
      rows.filter((r) => !r.expiresAt || r.expiresAt.getTime() > nowMs).map((r) => r.businessId)
    );
  }

  // Whether a business currently holds a specific add-on (the gate helper).
  async businessHasAddon(businessId: string, addonKey: string): Promise<boolean> {
    const [row] = await db
      .select()
      .from(businessAddons)
      .where(
        and(
          eq(businessAddons.businessId, businessId),
          eq(businessAddons.addonKey, addonKey),
          eq(businessAddons.status, "active")
        )
      );
    if (!row) return false;
    return !row.expiresAt || row.expiresAt.getTime() > Date.now();
  }

  // The subscription tier of a business's owner (drives tier-included add-ons).
  async getBusinessOwnerTier(businessId: string): Promise<string | null> {
    const business = await this.getBusiness(businessId);
    if (!business?.ownerId) return null;
    const owner = await this.getUser(business.ownerId);
    return owner?.subscriptionTier ?? null;
  }

  // Effective entitlement: a business "has" an add-on if it purchased it OR its
  // owner's plan includes it for free. This is the canonical gate used across
  // the feature routes so tier-included add-ons work without a purchase row.
  async businessHasAddonEffective(businessId: string, addonKey: string): Promise<boolean> {
    if (await this.businessHasAddon(businessId, addonKey)) return true;
    return isAddonIncludedInTier(addonKey, await this.getBusinessOwnerTier(businessId));
  }

  // Active entitlements for the owner UI, including synthesized "included" rows
  // for add-ons the owner's plan grants for free (so the panel shows them as
  // active without a purchase). Shape matches BusinessAddon for existing readers.
  async getEffectiveBusinessAddons(businessId: string): Promise<Array<Record<string, any>>> {
    const purchased = await this.getBusinessAddons(businessId);
    const owned = new Set(purchased.map((r) => r.addonKey));
    const tier = await this.getBusinessOwnerTier(businessId);
    const included = Object.values(ADDON_CATALOG)
      .filter((a) => !owned.has(a.key) && isAddonIncludedInTier(a.key, tier))
      .map((a) => ({
        id: `included:${a.key}`,
        businessId,
        addonKey: a.key,
        status: "active",
        source: "included",
        expiresAt: null,
      }));
    return [...purchased, ...included];
  }

  // Activate (or re-activate) an add-on for a business. Idempotent on the
  // activating charge's payment-intent id; upserts on (businessId, addonKey).
  async activateBusinessAddon(input: {
    businessId: string;
    addonKey: string;
    source?: string;
    stripePaymentIntentId?: string;
    expiresAt?: Date | null;
  }): Promise<BusinessAddon> {
    if (input.stripePaymentIntentId) {
      const [existing] = await db
        .select()
        .from(businessAddons)
        .where(eq(businessAddons.stripePaymentIntentId, input.stripePaymentIntentId));
      if (existing) return existing;
    }
    const [row] = await db
      .insert(businessAddons)
      .values({
        businessId: input.businessId,
        addonKey: input.addonKey,
        status: "active",
        source: input.source || "stripe",
        stripePaymentIntentId: input.stripePaymentIntentId ?? null,
        activatedAt: new Date(),
        expiresAt: input.expiresAt ?? null,
      })
      .onConflictDoUpdate({
        target: [businessAddons.businessId, businessAddons.addonKey],
        set: {
          status: "active",
          source: input.source || "stripe",
          stripePaymentIntentId: input.stripePaymentIntentId ?? null,
          activatedAt: new Date(),
          // CHR-82: keep the LATER expiry so a renewal/re-purchase never shortens
          // an existing entitlement. NULL = no expiry (infinite) wins over any date.
          expiresAt: sql`CASE WHEN ${businessAddons.expiresAt} IS NULL OR excluded.expires_at IS NULL THEN NULL ELSE GREATEST(${businessAddons.expiresAt}, excluded.expires_at) END`,
          updatedAt: new Date(),
        },
      })
      .returning();
    return row;
  }

  // ── CHR-68: custom tap-screen branding (add-on) ──
  async getTapBranding(businessId: string): Promise<BusinessTapBranding | undefined> {
    const [row] = await db
      .select()
      .from(businessTapBranding)
      .where(eq(businessTapBranding.businessId, businessId));
    return row || undefined;
  }

  async upsertTapBranding(
    businessId: string,
    data: { brandColor?: string | null; accentColor?: string | null; slogan?: string | null; logoUrl?: string | null; links?: unknown }
  ): Promise<BusinessTapBranding> {
    const values = {
      businessId,
      brandColor: data.brandColor ?? null,
      accentColor: data.accentColor ?? null,
      slogan: data.slogan ?? null,
      logoUrl: data.logoUrl ?? null,
      links: (data.links as any) ?? [],
    };
    const [row] = await db
      .insert(businessTapBranding)
      .values(values)
      .onConflictDoUpdate({
        target: businessTapBranding.businessId,
        set: { ...values, updatedAt: new Date() },
      })
      .returning();
    return row;
  }

  // ── CHR-34 / CHR-71: donation-per-tap campaigns ──
  async createDonationCampaign(data: InsertDonationCampaign): Promise<DonationCampaign> {
    const [row] = await db.insert(donationCampaigns).values(data).returning();
    return row;
  }

  async getDonationCampaign(id: string): Promise<DonationCampaign | undefined> {
    const [row] = await db.select().from(donationCampaigns).where(eq(donationCampaigns.id, id));
    return row || undefined;
  }

  async addDonationCampaignMember(donationCampaignId: string, businessId: string): Promise<void> {
    await db
      .insert(donationCampaignMembers)
      .values({ donationCampaignId, businessId })
      .onConflictDoNothing({ target: [donationCampaignMembers.donationCampaignId, donationCampaignMembers.businessId] });
  }

  async getDonationCampaignsForNonprofit(nonprofitId: string): Promise<DonationCampaign[]> {
    return await db
      .select()
      .from(donationCampaigns)
      .where(eq(donationCampaigns.nonprofitId, nonprofitId))
      .orderBy(desc(donationCampaigns.createdAt));
  }

  // Campaign + member stores (name/coords) + total raised so far.
  async getDonationCampaignWithMembers(id: string): Promise<any | undefined> {
    const campaign = await this.getDonationCampaign(id);
    if (!campaign) return undefined;
    const members = await db
      .select({
        businessId: donationCampaignMembers.businessId,
        name: businesses.name,
        latitude: businesses.latitude,
        longitude: businesses.longitude,
      })
      .from(donationCampaignMembers)
      .innerJoin(businesses, eq(donationCampaignMembers.businessId, businesses.id))
      .where(eq(donationCampaignMembers.donationCampaignId, id));
    const [{ raised }] = await db
      .select({ raised: sql<number>`coalesce(sum(${donations.amountCents}), 0)` })
      .from(donations)
      .where(eq(donations.donationCampaignId, id));
    return { ...campaign, members, totalRaisedCents: Number(raised) || 0 };
  }

  // CHR-72: active donation campaigns + members + nonprofit name + totals (map).
  async getActiveDonationCampaignsWithMembers(): Promise<any[]> {
    const rows = await db
      .select()
      .from(donationCampaigns)
      .where(eq(donationCampaigns.isActive, true))
      .orderBy(desc(donationCampaigns.createdAt));
    const out: any[] = [];
    for (const dc of rows) {
      const full = await this.getDonationCampaignWithMembers(dc.id);
      const nonprofit = await this.getBusiness(dc.nonprofitId);
      out.push({ ...full, nonprofitName: nonprofit?.name || null });
    }
    return out;
  }

  // Accrue one donation per active campaign the tapped store belongs to.
  // Idempotent per (campaign, tap). Returns the donations booked by this tap.
  async recordDonationsForTap(
    businessId: string,
    tapId: string,
    customerEmail?: string | null
  ): Promise<{ campaignId: string; nonprofitId: string; amountCents: number; name: string }[]> {
    const active = await db
      .select({
        id: donationCampaigns.id,
        nonprofitId: donationCampaigns.nonprofitId,
        donationPerTapCents: donationCampaigns.donationPerTapCents,
        name: donationCampaigns.name,
      })
      .from(donationCampaignMembers)
      .innerJoin(donationCampaigns, eq(donationCampaignMembers.donationCampaignId, donationCampaigns.id))
      .where(and(eq(donationCampaignMembers.businessId, businessId), eq(donationCampaigns.isActive, true)));

    const now = new Date();
    const periodMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const out: { campaignId: string; nonprofitId: string; amountCents: number; name: string }[] = [];
    for (const c of active) {
      const [row] = await db
        .insert(donations)
        .values({
          donationCampaignId: c.id,
          nonprofitId: c.nonprofitId,
          businessId,
          tapId,
          customerEmail: customerEmail ?? null,
          amountCents: c.donationPerTapCents ?? 0,
          periodMonth,
        })
        .onConflictDoNothing({ target: [donations.donationCampaignId, donations.tapId] })
        .returning();
      if (row) out.push({ campaignId: c.id, nonprofitId: c.nonprofitId, amountCents: row.amountCents, name: c.name });
    }
    return out;
  }

  // Donation totals attributed to a nonprofit (lifetime + per-campaign + per-store).
  async getNonprofitDonationTotals(nonprofitId: string): Promise<any> {
    const rows = await db.select().from(donations).where(eq(donations.nonprofitId, nonprofitId));
    const campaigns = await this.getDonationCampaignsForNonprofit(nonprofitId);

    const lifetimeCents = rows.reduce((s, r) => s + (r.amountCents || 0), 0);
    const byCampaign = campaigns.map((c) => {
      const cr = rows.filter((r) => r.donationCampaignId === c.id);
      return {
        id: c.id,
        name: c.name,
        isActive: c.isActive,
        donationPerTapCents: c.donationPerTapCents,
        raisedCents: cr.reduce((s, r) => s + (r.amountCents || 0), 0),
        taps: cr.length,
      };
    });

    const storeIds = Array.from(new Set(rows.map((r) => r.businessId).filter(Boolean))) as string[];
    const storeRows = storeIds.length
      ? await db.select().from(businesses).where(inArray(businesses.id, storeIds))
      : [];
    const nameById = new Map(storeRows.map((b) => [b.id, b.name]));
    const byStore = storeIds.map((id) => {
      const sr = rows.filter((r) => r.businessId === id);
      return { businessId: id, name: nameById.get(id) || "Unknown", raisedCents: sr.reduce((s, r) => s + (r.amountCents || 0), 0), taps: sr.length };
    }).sort((a, b) => b.raisedCents - a.raisedCents);

    return { lifetimeCents, totalDonations: rows.length, byCampaign, byStore };
  }

  // ── CHR-75: customer favorites + business reminders ──
  async favoriteBusiness(input: { businessId: string; email?: string | null; deviceFingerprint?: string | null }): Promise<void> {
    const idConds = identityConds(customerFavorites.customerEmail, customerFavorites.deviceFingerprint, input.email, input.deviceFingerprint);
    if (idConds.length) {
      const [existing] = await db
        .select()
        .from(customerFavorites)
        .where(and(eq(customerFavorites.businessId, input.businessId), or(...idConds)));
      if (existing) return; // idempotent
    }
    await db.insert(customerFavorites).values({
      businessId: input.businessId,
      customerEmail: input.email ?? null,
      deviceFingerprint: input.deviceFingerprint ?? null,
    });
  }

  async unfavoriteBusiness(input: { businessId: string; email?: string | null; deviceFingerprint?: string | null }): Promise<boolean> {
    const idConds = identityConds(customerFavorites.customerEmail, customerFavorites.deviceFingerprint, input.email, input.deviceFingerprint);
    if (!idConds.length) return false;
    const res = await db
      .delete(customerFavorites)
      .where(and(eq(customerFavorites.businessId, input.businessId), or(...idConds)));
    return (res.rowCount ?? 0) > 0;
  }

  private async getFavoriteBusinessIds(email?: string | null, deviceFingerprint?: string | null): Promise<string[]> {
    const idConds = identityConds(customerFavorites.customerEmail, customerFavorites.deviceFingerprint, email, deviceFingerprint);
    if (!idConds.length) return [];
    const rows = await db.select().from(customerFavorites).where(or(...idConds));
    return Array.from(new Set(rows.map((r) => r.businessId)));
  }

  async getFavorites(email?: string | null, deviceFingerprint?: string | null): Promise<any[]> {
    const ids = await this.getFavoriteBusinessIds(email, deviceFingerprint);
    if (!ids.length) return [];
    const rows = await db.select().from(businesses).where(inArray(businesses.id, ids));
    return rows.map((b) => ({ id: b.id, name: b.name, description: b.description, latitude: b.latitude, longitude: b.longitude, isNonprofit: b.isNonprofit ?? false }));
  }

  async getFavoriterCount(businessId: string): Promise<number> {
    const [{ c }] = await db
      .select({ c: count() })
      .from(customerFavorites)
      .where(eq(customerFavorites.businessId, businessId));
    return Number(c) || 0;
  }

  async createReminder(input: { businessId: string; message: string; createdByUserId?: string | null }): Promise<any> {
    const [row] = await db
      .insert(businessReminders)
      .values({ businessId: input.businessId, message: input.message, createdByUserId: input.createdByUserId ?? null })
      .returning();
    return row;
  }

  // Reminders from businesses the customer favorites (their feed).
  async getRemindersForCustomer(email?: string | null, deviceFingerprint?: string | null): Promise<any[]> {
    const ids = await this.getFavoriteBusinessIds(email, deviceFingerprint);
    if (!ids.length) return [];
    return await db
      .select({
        id: businessReminders.id,
        businessId: businessReminders.businessId,
        businessName: businesses.name,
        message: businessReminders.message,
        createdAt: businessReminders.createdAt,
      })
      .from(businessReminders)
      .innerJoin(businesses, eq(businessReminders.businessId, businesses.id))
      .where(inArray(businessReminders.businessId, ids))
      .orderBy(desc(businessReminders.createdAt))
      .limit(50);
  }

  // CHR-73: a customer's tap count toward a campaign (punch-card progress).
  // Works with no account — identified by email and/or device fingerprint.
  async getCustomerCampaignProgress(
    campaignId: string,
    email?: string | null,
    deviceFingerprint?: string | null
  ): Promise<{ count: number; goal: number }> {
    const [c] = await db.select().from(campaigns).where(eq(campaigns.id, campaignId));
    const goal = (c?.tapGoal ?? 1) > 1 ? (c!.tapGoal as number) : 1;
    const idConds = identityConds(taps.customerEmail, taps.deviceFingerprint, email, deviceFingerprint);
    if (idConds.length === 0) return { count: 0, goal };
    const [{ n }] = await db
      .select({ n: count() })
      .from(taps)
      .where(and(eq(taps.campaignId, campaignId), or(...idConds)));
    return { count: Number(n) || 0, goal };
  }

  // ── CHR-33 / CHR-56: multi-store group campaigns ──
  async createGroupCampaign(data: InsertGroupCampaign): Promise<GroupCampaign> {
    const [row] = await db.insert(groupCampaigns).values(data).returning();
    return row;
  }

  async getGroupCampaign(id: string): Promise<GroupCampaign | undefined> {
    const [row] = await db.select().from(groupCampaigns).where(eq(groupCampaigns.id, id));
    return row || undefined;
  }

  async addGroupCampaignMember(
    groupCampaignId: string,
    businessId: string,
    status: string = "joined"
  ): Promise<GroupCampaignMember | undefined> {
    // Idempotent: skip if this business is already a member.
    const [existing] = await db
      .select()
      .from(groupCampaignMembers)
      .where(
        and(
          eq(groupCampaignMembers.groupCampaignId, groupCampaignId),
          eq(groupCampaignMembers.businessId, businessId)
        )
      );
    if (existing) return existing;
    const [row] = await db
      .insert(groupCampaignMembers)
      .values({ groupCampaignId, businessId, status })
      .returning();
    return row;
  }

  async getGroupCampaignMembers(groupCampaignId: string): Promise<GroupCampaignMember[]> {
    return await db
      .select()
      .from(groupCampaignMembers)
      .where(eq(groupCampaignMembers.groupCampaignId, groupCampaignId));
  }

  // Campaign + its member businesses (name + coordinates for the map).
  async getGroupCampaignWithMembers(id: string): Promise<any | undefined> {
    const campaign = await this.getGroupCampaign(id);
    if (!campaign) return undefined;
    const memberRows = await db
      .select({
        id: groupCampaignMembers.id,
        businessId: groupCampaignMembers.businessId,
        status: groupCampaignMembers.status,
        name: businesses.name,
        latitude: businesses.latitude,
        longitude: businesses.longitude,
      })
      .from(groupCampaignMembers)
      .innerJoin(businesses, eq(groupCampaignMembers.businessId, businesses.id))
      .where(eq(groupCampaignMembers.groupCampaignId, id));
    // Surface the funding host's name so the UI can show "reward hosted by X".
    const hostName = campaign.fundingBusinessId
      ? (memberRows.find((m) => m.businessId === campaign.fundingBusinessId)?.name
        ?? (await this.getBusiness(campaign.fundingBusinessId))?.name
        ?? null)
      : null;
    return { ...campaign, members: memberRows, hostName };
  }

  // CHR-54: partial update of a group campaign (feature toggle, activation, etc.).
  async updateGroupCampaign(id: string, updates: Partial<GroupCampaign>): Promise<GroupCampaign> {
    const [row] = await db
      .update(groupCampaigns)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(groupCampaigns.id, id))
      .returning();
    return row;
  }

  // CHR-54: a coordinator's own multi-store campaigns, each with member stores
  // (name + coords), per-location tap performance, and completion counts.
  async getCoordinatorGroupCampaigns(coordinatorUserId: string): Promise<any[]> {
    const campaigns = await db
      .select()
      .from(groupCampaigns)
      .where(
        and(
          eq(groupCampaigns.createdByUserId, coordinatorUserId),
          eq(groupCampaigns.creatorType, "coordinator")
        )
      )
      .orderBy(desc(groupCampaigns.createdAt));

    const out: any[] = [];
    for (const gc of campaigns) {
      const members = await db
        .select({
          businessId: groupCampaignMembers.businessId,
          name: businesses.name,
          latitude: businesses.latitude,
          longitude: businesses.longitude,
        })
        .from(groupCampaignMembers)
        .innerJoin(businesses, eq(groupCampaignMembers.businessId, businesses.id))
        .where(eq(groupCampaignMembers.groupCampaignId, gc.id));

      const memberIds = members.map((m) => m.businessId);
      const tapRows = memberIds.length
        ? await db.select().from(taps).where(inArray(taps.businessId, memberIds))
        : [];
      const progressRows = await db
        .select()
        .from(groupCampaignProgress)
        .where(eq(groupCampaignProgress.groupCampaignId, gc.id));

      const stores = members.map((m) => ({
        ...m,
        taps: tapRows.filter((t) => t.businessId === m.businessId).length,
      }));
      const required = gc.ruleType === "all" ? members.length : gc.requiredStores ?? 1;

      out.push({
        ...gc,
        requiredStores: required,
        stores,
        participants: progressRows.length,
        completions: progressRows.filter((p) => p.completedAt).length,
      });
    }
    return out;
  }

  // CHR-58: open/joinable group campaigns (with member counts).
  async getOpenGroupCampaigns(): Promise<any[]> {
    const rows = await db
      .select()
      .from(groupCampaigns)
      .where(and(eq(groupCampaigns.isOpen, true), eq(groupCampaigns.isActive, true)))
      .orderBy(desc(groupCampaigns.createdAt));
    const result: any[] = [];
    for (const gc of rows) {
      const [{ c }] = await db
        .select({ c: count() })
        .from(groupCampaignMembers)
        .where(and(
          eq(groupCampaignMembers.groupCampaignId, gc.id),
          eq(groupCampaignMembers.status, "joined"),
        ));
      result.push({ ...gc, memberCount: Number(c) });
    }
    return result;
  }

  // CHR-58: group campaigns a business belongs to.
  async getGroupCampaignsForBusiness(businessId: string): Promise<any[]> {
    return await db
      .select({
        id: groupCampaigns.id,
        name: groupCampaigns.name,
        ruleType: groupCampaigns.ruleType,
        requiredStores: groupCampaigns.requiredStores,
        isOpen: groupCampaigns.isOpen,
        isActive: groupCampaigns.isActive,
        status: groupCampaignMembers.status,
      })
      .from(groupCampaignMembers)
      .innerJoin(groupCampaigns, eq(groupCampaignMembers.groupCampaignId, groupCampaigns.id))
      .where(eq(groupCampaignMembers.businessId, businessId));
  }

  // CHR-58: a business leaves a group campaign.
  async removeGroupCampaignMember(groupCampaignId: string, businessId: string): Promise<boolean> {
    const result = await db
      .delete(groupCampaignMembers)
      .where(
        and(
          eq(groupCampaignMembers.groupCampaignId, groupCampaignId),
          eq(groupCampaignMembers.businessId, businessId)
        )
      );
    return (result.rowCount ?? 0) > 0;
  }

  // ── Campaign initiation/acceptance handshake ──────────────────────────────
  // Upsert a member row to a given status (invited | requested | joined).
  async setGroupCampaignMemberStatus(
    groupCampaignId: string,
    businessId: string,
    status: string,
  ): Promise<GroupCampaignMember> {
    const [row] = await db
      .insert(groupCampaignMembers)
      .values({ groupCampaignId, businessId, status })
      .onConflictDoUpdate({
        target: [groupCampaignMembers.groupCampaignId, groupCampaignMembers.businessId],
        set: { status },
      })
      .returning();
    return row;
  }

  async getGroupCampaignMember(groupCampaignId: string, businessId: string): Promise<GroupCampaignMember | undefined> {
    const [row] = await db
      .select()
      .from(groupCampaignMembers)
      .where(and(
        eq(groupCampaignMembers.groupCampaignId, groupCampaignId),
        eq(groupCampaignMembers.businessId, businessId),
      ));
    return row;
  }

  async getGroupCampaignsByCreator(userId: string): Promise<GroupCampaign[]> {
    return await db
      .select()
      .from(groupCampaigns)
      .where(eq(groupCampaigns.createdByUserId, userId))
      .orderBy(desc(groupCampaigns.createdAt));
  }

  // Pending invites addressed to a set of businesses, with campaign + host info.
  async getPendingInvitesForBusinesses(businessIds: string[]): Promise<any[]> {
    if (businessIds.length === 0) return [];
    return await db
      .select({
        businessId: groupCampaignMembers.businessId,
        campaignId: groupCampaigns.id,
        name: groupCampaigns.name,
        ruleType: groupCampaigns.ruleType,
        requiredStores: groupCampaigns.requiredStores,
        rewardType: groupCampaigns.rewardType,
        rewardTitle: groupCampaigns.rewardTitle,
        rewardValue: groupCampaigns.rewardValue,
        rewardPoints: groupCampaigns.rewardPoints,
        fundingBusinessId: groupCampaigns.fundingBusinessId,
      })
      .from(groupCampaignMembers)
      .innerJoin(groupCampaigns, eq(groupCampaignMembers.groupCampaignId, groupCampaigns.id))
      .where(and(
        inArray(groupCampaignMembers.businessId, businessIds),
        eq(groupCampaignMembers.status, "invited"),
      ));
  }

  // Pending join-requests for a set of campaigns, with the requesting business.
  async getPendingRequestsForCampaigns(campaignIds: string[]): Promise<any[]> {
    if (campaignIds.length === 0) return [];
    return await db
      .select({
        campaignId: groupCampaignMembers.groupCampaignId,
        campaignName: groupCampaigns.name,
        businessId: groupCampaignMembers.businessId,
        businessName: businesses.name,
      })
      .from(groupCampaignMembers)
      .innerJoin(groupCampaigns, eq(groupCampaignMembers.groupCampaignId, groupCampaigns.id))
      .innerJoin(businesses, eq(groupCampaignMembers.businessId, businesses.id))
      .where(and(
        inArray(groupCampaignMembers.groupCampaignId, campaignIds),
        eq(groupCampaignMembers.status, "requested"),
      ));
  }

  // Active campaigns a business could ask to join (not already a member; not its
  // own owner's campaigns).
  async getJoinableCampaignsForBusiness(businessId: string, ownerId: string): Promise<any[]> {
    const existing = await db
      .select({ id: groupCampaignMembers.groupCampaignId })
      .from(groupCampaignMembers)
      .where(eq(groupCampaignMembers.businessId, businessId));
    const memberOf = new Set(existing.map((r) => r.id));
    const rows = await db
      .select()
      .from(groupCampaigns)
      .where(eq(groupCampaigns.isActive, true))
      .orderBy(desc(groupCampaigns.createdAt))
      .limit(50);
    return rows.filter((gc) => !memberOf.has(gc.id) && gc.createdByUserId !== ownerId);
  }

  // Claimed businesses matching a name query (invite targets — they need an owner
  // to accept).
  async searchClaimedBusinesses(q: string, limit = 12): Promise<{ id: string; name: string }[]> {
    const rows = await db
      .select({ id: businesses.id, name: businesses.name })
      .from(businesses)
      .where(and(isNotNull(businesses.ownerId), sql`${businesses.name} ILIKE ${"%" + q + "%"}`))
      .limit(limit);
    return rows;
  }

  // CHR-59: active group campaigns with their member stores (for the map).
  async getActiveGroupCampaignsWithMembers(): Promise<any[]> {
    const rows = await db
      .select()
      .from(groupCampaigns)
      .where(eq(groupCampaigns.isActive, true))
      .orderBy(desc(groupCampaigns.createdAt));
    if (rows.length === 0) return [];
    // CHR-81: fetch every campaign's members in one query (was 1+N), group in JS.
    const memberRows = await db
      .select({
        groupCampaignId: groupCampaignMembers.groupCampaignId,
        businessId: groupCampaignMembers.businessId,
        name: businesses.name,
        latitude: businesses.latitude,
        longitude: businesses.longitude,
      })
      .from(groupCampaignMembers)
      .innerJoin(businesses, eq(groupCampaignMembers.businessId, businesses.id))
      .where(and(
        inArray(groupCampaignMembers.groupCampaignId, rows.map((r) => r.id)),
        eq(groupCampaignMembers.status, "joined"), // map shows only accepted members
      ));
    const byCampaign = new Map<string, any[]>();
    for (const m of memberRows) {
      const list = byCampaign.get(m.groupCampaignId) ?? [];
      list.push({ businessId: m.businessId, name: m.name, latitude: m.latitude, longitude: m.longitude });
      byCampaign.set(m.groupCampaignId, list);
    }
    return rows.map((gc) => {
      const members = byCampaign.get(gc.id) ?? [];
      const required = gc.ruleType === "all" ? members.length : gc.requiredStores ?? 1;
      return {
        id: gc.id,
        name: gc.name,
        description: gc.description,
        ruleType: gc.ruleType,
        requiredStores: required,
        rewardTitle: gc.rewardTitle,
        isFeatured: gc.isFeatured ?? false, // CHR-54: coordinator map promotion
        members,
      };
    });
  }

  // CHR-59: a customer's progress toward a group campaign (no account needed —
  // matched by email and/or device fingerprint).
  async getCustomerGroupProgress(
    groupCampaignId: string,
    email?: string,
    deviceFingerprint?: string
  ): Promise<any | null> {
    const gc = await this.getGroupCampaign(groupCampaignId);
    if (!gc) return null;
    const members = await this.getGroupCampaignMembers(groupCampaignId);
    const required = gc.ruleType === "all" ? members.length : gc.requiredStores ?? 1;
    let visited: string[] = [];
    let completed = false;
    if (email || deviceFingerprint) {
      const conds = identityConds(groupCampaignProgress.customerEmail, groupCampaignProgress.deviceFingerprint, email, deviceFingerprint);
      const [p] = await db
        .select()
        .from(groupCampaignProgress)
        .where(and(eq(groupCampaignProgress.groupCampaignId, groupCampaignId), or(...conds)));
      if (p) {
        visited = Array.isArray(p.visitedBusinessIds) ? (p.visitedBusinessIds as string[]) : [];
        completed = !!p.completedAt;
      }
    }
    return { groupCampaignId, required, visited, visitedCount: visited.length, completed };
  }

  // CHR-57: a tap at `businessId` advances the customer's progress in every
  // active group campaign that store belongs to; completing the rule unlocks
  // the group reward exactly once. Customer identity works without an account
  // (matched by email and/or device fingerprint). Returns per-campaign status.
  private async advanceGroupCampaigns(
    businessId: string,
    customerEmail: string | null | undefined,
    deviceFingerprint: string | null | undefined,
    customer: User | undefined
  ): Promise<any[]> {
    const memberOf = await db
      .select({
        id: groupCampaigns.id,
        name: groupCampaigns.name,
        ruleType: groupCampaigns.ruleType,
        requiredStores: groupCampaigns.requiredStores,
        rewardType: groupCampaigns.rewardType,
        rewardTitle: groupCampaigns.rewardTitle,
        rewardValue: groupCampaigns.rewardValue,
        rewardPoints: groupCampaigns.rewardPoints,
        fundingBusinessId: groupCampaigns.fundingBusinessId,
      })
      .from(groupCampaignMembers)
      .innerJoin(groupCampaigns, eq(groupCampaignMembers.groupCampaignId, groupCampaigns.id))
      // Only JOINED members participate — an invited/requested store must not
      // advance progress or unlock rewards until it accepts.
      .where(and(
        eq(groupCampaignMembers.businessId, businessId),
        eq(groupCampaignMembers.status, "joined"),
        eq(groupCampaigns.isActive, true),
      ));

    // Current JOINED member business ids for a campaign. Used both to size
    // `required` (rule "all") and to count only visits to CURRENT members (CHR-79).
    const memberIdsFor = async (gcId: string): Promise<Set<string>> => {
      const rows = await db
        .select({ b: groupCampaignMembers.businessId })
        .from(groupCampaignMembers)
        .where(and(
          eq(groupCampaignMembers.groupCampaignId, gcId),
          eq(groupCampaignMembers.status, "joined"),
        ));
      return new Set(rows.map((r) => r.b));
    };

    const summaries: any[] = [];
    for (const gc of memberOf) {
      const memberIds = await memberIdsFor(gc.id);
      const required =
        gc.ruleType === "all" ? memberIds.size || 1 : gc.requiredStores ?? 1;

      // Resolve (or create) this customer's progress row for the campaign.
      const idConds = identityConds(groupCampaignProgress.customerEmail, groupCampaignProgress.deviceFingerprint, customerEmail, deviceFingerprint);
      let progress = idConds.length
        ? (
            await db
              .select()
              .from(groupCampaignProgress)
              .where(and(eq(groupCampaignProgress.groupCampaignId, gc.id), or(...idConds)))
          )[0]
        : undefined;
      if (!progress) {
        [progress] = await db
          .insert(groupCampaignProgress)
          .values({
            groupCampaignId: gc.id,
            customerEmail: customerEmail ?? null,
            deviceFingerprint: deviceFingerprint ?? null,
            visitedBusinessIds: [],
            visitCount: 0,
          })
          .returning();
      } else {
        // CHR-79: backfill a missing identifier so a later tap that carries only
        // the other identifier resolves to THIS row instead of spawning a
        // duplicate progress row that splits the visited set.
        const patch: any = {};
        if (customerEmail && !progress.customerEmail) patch.customerEmail = customerEmail;
        if (deviceFingerprint && !progress.deviceFingerprint) patch.deviceFingerprint = deviceFingerprint;
        if (Object.keys(patch).length) {
          await db
            .update(groupCampaignProgress)
            .set(patch)
            .where(eq(groupCampaignProgress.id, progress.id));
          Object.assign(progress, patch);
        }
      }

      const visited: string[] = Array.isArray(progress.visitedBusinessIds)
        ? (progress.visitedBusinessIds as string[])
        : [];
      const alreadyComplete = !!progress.completedAt;
      // Count only distinct visits to stores that are STILL members — a store
      // that later left must not count toward `required` (CHR-79).
      const distinctCurrent = (ids: string[]) =>
        new Set(ids.filter((id) => memberIds.has(id))).size;

      if (visited.includes(businessId) || alreadyComplete) {
        summaries.push({
          groupCampaignId: gc.id,
          name: gc.name,
          visited: distinctCurrent(visited),
          required,
          completed: alreadyComplete,
          rewardUnlocked: false,
        });
        continue;
      }

      visited.push(businessId);
      const effectiveVisited = distinctCurrent(visited);
      const nowComplete = effectiveVisited >= required;
      let rewardId = progress.rewardId ?? null;

      if (nowComplete && !rewardId) {
        // Attribute the reward to the campaign's funding host (the business that
        // agreed to fund/redeem it), NOT the arbitrary store where the customer
        // happened to finish. Falls back to the completing store only when no
        // host is set (points/platform-funded campaigns).
        const rewardBusinessId = gc.fundingBusinessId ?? businessId;
        const [gr] = await db
          .insert(rewards)
          .values({
            userId: customer?.id ?? null,
            businessId: rewardBusinessId,
            campaignId: null,
            type: gc.rewardType ?? "discount",
            title: gc.rewardTitle ?? `${gc.name} Reward`,
            description: `Completed ${gc.name}`,
            value: gc.rewardValue,
            code: `GRP${Date.now()}`,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          })
          .returning();
        rewardId = gr.id;
        if ((gc.rewardPoints ?? 0) > 0 && customer) {
          await db
            .update(users)
            .set({
              totalPoints: sql`${users.totalPoints} + ${gc.rewardPoints}`,
              availablePoints: sql`${users.availablePoints} + ${gc.rewardPoints}`,
              totalPointsEarned: sql`${users.totalPointsEarned} + ${gc.rewardPoints}`,
            })
            .where(eq(users.id, customer.id));
        }
        // Fair-split a funded reward's cost across the stores the customer
        // actually visited (tap-weighted); the host keeps its own share.
        if (gc.fundingBusinessId) {
          const cents = Math.round(parseFloat(String(gc.rewardValue ?? "0")) * 100);
          if (cents > 0) {
            await this.accrueRewardContributions({
              groupCampaignId: gc.id,
              rewardId: gr.id,
              hostBusinessId: gc.fundingBusinessId,
              visitedBusinessIds: visited.filter((id) => memberIds.has(id)),
              customerEmail,
              totalRewardCents: cents,
            });
          }
        }
      }

      await db
        .update(groupCampaignProgress)
        .set({
          visitedBusinessIds: visited,
          visitCount: effectiveVisited,
          completedAt: nowComplete ? new Date() : null,
          rewardId,
          updatedAt: new Date(),
        })
        .where(eq(groupCampaignProgress.id, progress.id));

      summaries.push({
        groupCampaignId: gc.id,
        name: gc.name,
        visited: effectiveVisited,
        required,
        completed: nowComplete,
        rewardUnlocked: nowComplete && !!rewardId,
      });
    }
    return summaries;
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
  async processTap(
    tap: InsertTap,
    opts?: { latitude?: number; longitude?: number }
  ): Promise<{ success: boolean; reward?: Reward; pointsEarned?: number; message: string; reason?: string; groupProgress?: any[]; donations?: any[]; progress?: { count: number; goal: number; rewardEarned: boolean } }> {
    try {
      const now = Date.now();

      // Anti-abuse 1: reject a repeat tap of the same tag by the same customer
      // within a short cooldown window.
      const COOLDOWN_MS = 60 * 1000;
      const [recent] = await db
        .select()
        .from(taps)
        .where(and(eq(taps.tagId, tap.tagId), eq(taps.customerEmail, tap.customerEmail)))
        .orderBy(desc(taps.createdAt))
        .limit(1);
      if (recent?.createdAt && now - recent.createdAt.getTime() < COOLDOWN_MS) {
        return {
          success: false,
          reason: "cooldown",
          message: "You've already tapped this tag. Please wait a moment before tapping again.",
        };
      }

      // Anti-abuse 2: per-device rate limit across ALL tags. No-account
      // customers are identified only by a device fingerprint, so a single
      // device hammering many tags/emails is throttled here.
      const DEVICE_WINDOW_MS = 60 * 1000;
      const DEVICE_MAX = 8;
      if (tap.deviceFingerprint) {
        const since = new Date(now - DEVICE_WINDOW_MS);
        const [{ c }] = await db
          .select({ c: count() })
          .from(taps)
          .where(
            and(
              eq(taps.deviceFingerprint, tap.deviceFingerprint),
              sql`${taps.createdAt} >= ${since}`
            )
          );
        if (Number(c) >= DEVICE_MAX) {
          return {
            success: false,
            reason: "device_throttled",
            message: "Too many taps from this device. Please slow down and try again shortly.",
          };
        }
      }

      // Resolve the campaign (if any) to determine reward + points. Fall back to
      // the scanned tag's campaign when the client didn't pass one (e.g. the NFC
      // scan path), so tag→campaign is authoritative for punch-card progress.
      const tagRow = tap.tagId ? await this.getNFCTag(tap.tagId) : undefined;
      const resolvedCampaignId = tap.campaignId ?? tagRow?.campaignId ?? undefined;
      const campaign = resolvedCampaignId ? await this.getCampaign(resolvedCampaignId) : undefined;
      const campaignActive = !!campaign && campaign.isActive === true;

      // Anti-abuse 3: optional per-campaign GPS proximity gate. Only unlock the
      // reward when the customer is within the configured radius of the business.
      if (campaignActive && campaign!.gpsRequired) {
        if (opts?.latitude == null || opts?.longitude == null) {
          return {
            success: false,
            reason: "location_required",
            message: "Please enable location to earn this reward.",
          };
        }
        const business = await this.getBusiness(tap.businessId);
        // CHR-78: fail closed when the campaign requires proximity but the
        // business has no coordinates to measure against — otherwise the gate is
        // silently skipped and the reward is granted from any distance.
        if (business?.latitude == null || business?.longitude == null) {
          return {
            success: false,
            reason: "location_required",
            message: "This reward requires location, but the business location hasn't been set up yet.",
          };
        }
        const radius = campaign!.gpsRadius ?? 100;
        const distance = haversineMeters(
          opts.latitude,
          opts.longitude,
          business.latitude,
          business.longitude
        );
        if (distance > radius) {
          return {
            success: false,
            reason: "too_far",
            message: `You must be within ${radius}m of ${business.name} to earn this reward.`,
          };
        }
      }

      const points = campaignActive ? (campaign!.pointsAwarded ?? 0) : 0;
      const customer = tap.customerEmail ? await this.getUserByEmail(tap.customerEmail) : undefined;

      // Record the tap (with the points earned). Stamp campaignId so punch-card
      // progress (CHR-73) can be counted per campaign.
      const [newTap] = await db
        .insert(taps)
        .values({ ...tap, campaignId: campaign?.id ?? (tap as any).campaignId ?? null, pointsEarned: points })
        .returning();

      // Update tap counters. The tag and business rows are independent, so run
      // the two increments concurrently (CHR-81).
      await Promise.all([
        db
          .update(nfcTags)
          .set({ totalTaps: sql`${nfcTags.totalTaps} + 1`, lastTapAt: new Date() })
          .where(eq(nfcTags.id, tap.tagId)),
        db
          .update(businesses)
          .set({ totalTaps: sql`${businesses.totalTaps} + 1` })
          .where(eq(businesses.id, tap.businessId)),
      ]);

      // CHR-73: punch-card progress. For a tapGoal>1 campaign the reward issues
      // only once the customer reaches the goal (every goal-th tap); tapGoal<=1
      // keeps the per-tap behaviour. Identity works with no account.
      let progress: { count: number; goal: number; rewardEarned: boolean } | undefined;
      let rewardEarned = campaignActive;
      if (campaignActive && campaign) {
        const goal = (campaign.tapGoal ?? 1) > 1 ? (campaign.tapGoal as number) : 1;
        const prog = await this.getCustomerCampaignProgress(
          campaign.id,
          tap.customerEmail,
          (tap as any).deviceFingerprint
        );
        // CHR-80: the tap just inserted means this customer has at least 1 tap
        // for the campaign. Floor at 1 so an unresolved identity (e.g. a
        // whitespace-only email that trims to "") can't make prog.count 0 and
        // trip `0 % goal === 0`, which would issue a punch-card reward on tap #1.
        const total = Math.max(prog.count, 1);
        rewardEarned = total % goal === 0;
        progress = { count: total % goal === 0 ? goal : total % goal, goal, rewardEarned };
      }

      // Create a reward from the active campaign, owned by the customer (if they
      // have an account) so they can later redeem it.
      let reward: Reward | undefined;
      if (campaignActive && campaign && rewardEarned) {
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

      // A real customer tap advances their daily streak (milestone bonuses paid
      // into points) and completes any pending referral (rewards both parties).
      if (customer) {
        try {
          await this.updateStreak(customer.id);
          if (tap.customerEmail) await this.processReferralCompletion(tap.customerEmail);
        } catch (e) {
          console.error("streak/referral update failed:", e);
        }
      }

      // CHR-57: advance any multi-store group campaigns this store belongs to.
      const groupProgress = await this.advanceGroupCampaigns(
        tap.businessId,
        tap.customerEmail,
        (tap as any).deviceFingerprint,
        customer
      );
      const groupUnlocked = groupProgress.some((g) => g.rewardUnlocked);

      // CHR-71: accrue donation-per-tap for any active donation campaign this
      // store participates in (idempotent per tap).
      const donationsBooked = await this.recordDonationsForTap(
        tap.businessId,
        newTap.id,
        tap.customerEmail
      );

      return {
        success: true,
        reward,
        pointsEarned: points,
        groupProgress,
        donations: donationsBooked,
        progress,
        message: groupUnlocked
          ? "Group reward unlocked! You completed the trail."
          : reward
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

  // ── Manual reward/balance adjustments (admin + coordinator ops tool) ──────
  // (getReward already exists above for code/lookup reuse.)

  // Apply a signed delta to a customer's loyalty points. availablePoints and
  // totalPoints are floored at 0 so a correction can't drive a balance negative.
  async adjustCustomerPoints(
    userId: string,
    delta: number,
  ): Promise<{ availablePoints: number; totalPoints: number }> {
    const [row] = await db
      .update(users)
      .set({
        availablePoints: sql`GREATEST(0, COALESCE(${users.availablePoints}, 0) + ${delta})`,
        totalPoints: sql`GREATEST(0, COALESCE(${users.totalPoints}, 0) + ${delta})`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning({ availablePoints: users.availablePoints, totalPoints: users.totalPoints });
    return { availablePoints: row?.availablePoints ?? 0, totalPoints: row?.totalPoints ?? 0 };
  }

  // Grant a reward to a customer manually (e.g. to make good on a missed tap).
  async createManualReward(input: {
    userId: string;
    businessId: string;
    type: string;
    title: string;
    value?: string | null;
  }): Promise<Reward> {
    const [row] = await db
      .insert(rewards)
      .values({
        userId: input.userId,
        businessId: input.businessId,
        type: input.type,
        title: input.title,
        value: input.value ?? null,
        code: `MANUAL${Date.now()}`,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      })
      .returning();
    return row;
  }

  async setRewardRedeemed(rewardId: string, redeemed: boolean): Promise<Reward> {
    const [row] = await db
      .update(rewards)
      .set({ isRedeemed: redeemed, redeemedAt: redeemed ? new Date() : null })
      .where(eq(rewards.id, rewardId))
      .returning();
    return row;
  }

  async createRewardAdjustment(data: {
    actorUserId: string;
    actorRole: string;
    targetUserId?: string | null;
    targetEmail?: string | null;
    businessId?: string | null;
    kind: string;
    pointsDelta?: number | null;
    rewardId?: string | null;
    reason?: string | null;
  }): Promise<RewardAdjustment> {
    const [row] = await db.insert(rewardAdjustments).values(data).returning();
    return row;
  }

  async getRewardAdjustmentsForUser(targetUserId: string): Promise<RewardAdjustment[]> {
    return await db
      .select()
      .from(rewardAdjustments)
      .where(eq(rewardAdjustments.targetUserId, targetUserId))
      .orderBy(desc(rewardAdjustments.createdAt))
      .limit(50);
  }

  // Is this customer "active" in the given businesses — i.e. do they have a tap
  // (by email) OR a reward (by userId) at any of them? Used to scope a
  // coordinator to customers in their territory.
  async customerActiveInBusinesses(
    userId: string | null | undefined,
    email: string | null | undefined,
    businessIds: string[],
  ): Promise<boolean> {
    if (businessIds.length === 0) return false;
    if (email) {
      const [tap] = await db
        .select({ id: taps.id })
        .from(taps)
        .where(and(eq(taps.customerEmail, email), inArray(taps.businessId, businessIds)))
        .limit(1);
      if (tap) return true;
    }
    if (userId) {
      const [rew] = await db
        .select({ id: rewards.id })
        .from(rewards)
        .where(and(eq(rewards.userId, userId), inArray(rewards.businessId, businessIds)))
        .limit(1);
      if (rew) return true;
    }
    return false;
  }

  // Referral operations
  async createReferral(referral: InsertReferral): Promise<Referral> {
    const [newReferral] = await db.insert(referrals).values(referral).returning();
    return newReferral;
  }

  async getReferralsByUser(userId: string): Promise<Referral[]> {
    return await db.select().from(referrals).where(eq(referrals.referrerId, userId));
  }

  // ── Streaks ────────────────────────────────────────────────────────────────
  // Advance a customer's daily tap streak. Same-day taps don't change it; a tap
  // the day after keeps the chain; a gap resets to 1. Milestone streaks pay a
  // bonus into the points economy. Returns the new streak + any bonus awarded.
  async updateStreak(userId: string): Promise<{ currentStreak: number; milestoneBonus: number }> {
    const [u] = await db.select().from(users).where(eq(users.id, userId));
    if (!u) return { currentStreak: 0, milestoneBonus: 0 };
    const midnight = new Date(); midnight.setUTCHours(0, 0, 0, 0);
    const today = midnight.toISOString().slice(0, 10);
    const yesterday = new Date(midnight.getTime() - 86400000).toISOString().slice(0, 10);
    const last = (u as any).streakLastDate as string | null;
    if (last === today) return { currentStreak: u.currentStreak ?? 0, milestoneBonus: 0 };

    const newStreak = last === yesterday ? (u.currentStreak ?? 0) + 1 : 1;
    const longest = Math.max(u.longestStreak ?? 0, newStreak);
    const MILESTONES: Record<number, number> = { 3: 15, 7: 50, 14: 100, 30: 250 };
    const bonus = MILESTONES[newStreak] ?? 0;
    await db.update(users).set({
      currentStreak: newStreak,
      longestStreak: longest,
      streakLastDate: today,
      ...(bonus > 0 ? {
        totalPoints: sql`COALESCE(${users.totalPoints},0) + ${bonus}`,
        availablePoints: sql`COALESCE(${users.availablePoints},0) + ${bonus}`,
        totalPointsEarned: sql`COALESCE(${users.totalPointsEarned},0) + ${bonus}`,
      } : {}),
      updatedAt: new Date(),
    }).where(eq(users.id, userId));
    return { currentStreak: newStreak, milestoneBonus: bonus };
  }

  // ── Referrals (double-sided reward) ─────────────────────────────────────────
  private REFERRER_BONUS = 100;
  private REFEREE_BONUS = 50;

  async getUserByReferralCode(code: string): Promise<User | undefined> {
    const [u] = await db.select().from(users).where(eq(users.referralCode, code));
    return u;
  }

  // Ensure a user has a stable, unique referral code (persist if missing).
  async ensureReferralCode(userId: string): Promise<string> {
    const [u] = await db.select().from(users).where(eq(users.id, userId));
    if ((u as any)?.referralCode) return (u as any).referralCode;
    const code = `CQ${(userId.replace(/-/g, "").slice(0, 6)).toUpperCase()}`;
    await db.update(users).set({ referralCode: code }).where(eq(users.id, userId));
    return code;
  }

  async getReferralForReferee(refereeId: string, refereeEmail: string | null): Promise<Referral | undefined> {
    const [byId] = await db.select().from(referrals).where(eq(referrals.refereeId, refereeId)).limit(1);
    if (byId) return byId;
    if (refereeEmail) {
      const [byEmail] = await db.select().from(referrals).where(eq(referrals.refereeEmail, refereeEmail)).limit(1);
      return byEmail;
    }
    return undefined;
  }

  // Complete a referee's pending referral on their first qualifying tap: reward
  // BOTH parties and mark it paid. Idempotent (only touches pending rows).
  async processReferralCompletion(refereeEmail: string): Promise<void> {
    const pending = await db.select().from(referrals)
      .where(and(eq(referrals.refereeEmail, refereeEmail), eq(referrals.status, "pending")));
    for (const r of pending) {
      await db.update(referrals).set({
        status: "completed", completedAt: new Date(),
        bonusPaid: true, bonusAmount: String(this.REFERRER_BONUS),
      }).where(eq(referrals.id, r.id));
      // Reward the referrer.
      await db.update(users).set({
        totalPoints: sql`COALESCE(${users.totalPoints},0) + ${this.REFERRER_BONUS}`,
        availablePoints: sql`COALESCE(${users.availablePoints},0) + ${this.REFERRER_BONUS}`,
        totalPointsEarned: sql`COALESCE(${users.totalPointsEarned},0) + ${this.REFERRER_BONUS}`,
      }).where(eq(users.id, r.referrerId));
      // Reward the referee.
      if (r.refereeId) {
        await db.update(users).set({
          totalPoints: sql`COALESCE(${users.totalPoints},0) + ${this.REFEREE_BONUS}`,
          availablePoints: sql`COALESCE(${users.availablePoints},0) + ${this.REFEREE_BONUS}`,
          totalPointsEarned: sql`COALESCE(${users.totalPointsEarned},0) + ${this.REFEREE_BONUS}`,
        }).where(eq(users.id, r.refereeId));
      }
    }
  }

  async getReferralStats(userId: string): Promise<{ completed: number; pending: number; pointsEarned: number; referrals: any[] }> {
    const rows = await db.select().from(referrals).where(eq(referrals.referrerId, userId)).orderBy(desc(referrals.createdAt));
    const completed = rows.filter((r) => r.status === "completed").length;
    const pending = rows.filter((r) => r.status === "pending").length;
    return { completed, pending, pointsEarned: completed * this.REFERRER_BONUS, referrals: rows };
  }

  async getReferralLeaderboard(limit = 10): Promise<any[]> {
    const rows = await db
      .select({ referrerId: referrals.referrerId })
      .from(referrals)
      .where(eq(referrals.status, "completed"));
    const counts = new Map<string, number>();
    for (const r of rows) counts.set(r.referrerId, (counts.get(r.referrerId) ?? 0) + 1);
    const top = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, limit);
    const out: any[] = [];
    for (const [uid, c] of top) {
      const u = await this.getUser(uid);
      out.push({ name: (u as any)?.firstName || (u as any)?.email || "Someone", referrals: c });
    }
    return out;
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
  // CHR-67: advanced analytics pack (add-on). Real aggregations beyond the base
  // CHR-27 dashboard — deterministic, computed from taps/rewards/tags.
  async getAdvancedAnalytics(businessId: string): Promise<any> {
    const tapRows = await this.getTaps(businessId);
    const tagRows = await this.getNFCTags(businessId);
    const rewardRows = await db.select().from(rewards).where(eq(rewards.businessId, businessId));

    const totalTaps = tapRows.length;

    // Best-performing tag zones: taps per tag (by placement label).
    const labelById = new Map<string, string>();
    for (const tag of tagRows) labelById.set(tag.id, tag.location || tag.customLabel || "Unlabeled");
    const tapsByTag = new Map<string, number>();
    for (const t of tapRows) tapsByTag.set(t.tagId, (tapsByTag.get(t.tagId) ?? 0) + 1);
    const bestTagZones = Array.from(tapsByTag.entries())
      .map(([tagId, taps]) => ({
        tagId,
        zone: labelById.get(tagId) || "Unknown",
        taps,
        percentage: totalTaps > 0 ? Math.round((taps / totalTaps) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.taps - a.taps)
      .slice(0, 10);

    // Return-delay distribution: gaps between a customer's consecutive taps.
    const byCustomer = new Map<string, number[]>();
    for (const t of tapRows) {
      if (!t.customerEmail || !t.createdAt) continue;
      const arr = byCustomer.get(t.customerEmail) ?? [];
      arr.push(new Date(t.createdAt).getTime());
      byCustomer.set(t.customerEmail, arr);
    }
    const buckets = { under1h: 0, h1to24: 0, d1to7: 0, over7d: 0 };
    let gapCount = 0;
    let gapHoursTotal = 0;
    let returningCustomers = 0;
    for (const times of Array.from(byCustomer.values())) {
      if (times.length < 2) continue;
      returningCustomers += 1;
      times.sort((a, b) => a - b);
      for (let i = 1; i < times.length; i++) {
        const hours = (times[i] - times[i - 1]) / 3_600_000;
        gapHoursTotal += hours;
        gapCount += 1;
        if (hours < 1) buckets.under1h += 1;
        else if (hours < 24) buckets.h1to24 += 1;
        else if (hours < 24 * 7) buckets.d1to7 += 1;
        else buckets.over7d += 1;
      }
    }
    const returnDelay = {
      buckets,
      avgReturnHours: gapCount > 0 ? Math.round((gapHoursTotal / gapCount) * 10) / 10 : 0,
      returningCustomers,
    };

    // Busiest hour-of-day (24) and day-of-week (Sun..Sat) buckets — heatmap-ready.
    const byHour = Array.from({ length: 24 }, (_, hour) => ({ hour, taps: 0 }));
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const byDay = dayNames.map((day) => ({ day, taps: 0 }));
    for (const t of tapRows) {
      if (!t.createdAt) continue;
      const d = new Date(t.createdAt);
      // CHR-83: bucket by the stored (UTC) hour/day, consistent with
      // getBusinessAnalytics — getHours()/getDay() applied a process-local shift.
      byHour[d.getUTCHours()].taps += 1;
      byDay[d.getUTCDay()].taps += 1;
    }

    // Redemption funnel: taps → rewards issued → redeemed.
    const rewardsIssued = rewardRows.length;
    const rewardsRedeemed = rewardRows.filter((r) => r.isRedeemed).length;
    const redemptionFunnel = {
      taps: totalTaps,
      rewardsIssued,
      rewardsRedeemed,
      tapToRewardRate: totalTaps > 0 ? Math.round((rewardsIssued / totalTaps) * 1000) / 10 : 0,
      redemptionRate: rewardsIssued > 0 ? Math.round((rewardsRedeemed / rewardsIssued) * 1000) / 10 : 0,
    };

    return { bestTagZones, returnDelay, busiestHours: byHour, busiestDays: byDay, redemptionFunnel };
  }

  async getBusinessAnalytics(businessId?: string, customerEmail?: string): Promise<any> {
    const num = (v: unknown): number => {
      const n = parseFloat(String(v ?? "0"));
      return Number.isFinite(n) ? n : 0;
    };

    // Small tables loaded whole (bounded); the large taps/rewards tables are
    // aggregated in SQL below (CHR-81) rather than fully materialized.
    const campaignRows = await this.getCampaigns(businessId);
    const salesRows = businessId
      ? await this.getSalesData(businessId)
      : await db.select().from(salesData).orderBy(desc(salesData.date));
    const tagRows = businessId
      ? await this.getNFCTags(businessId)
      : await db.select().from(nfcTags);

    const tapConds = [];
    if (businessId) tapConds.push(eq(taps.businessId, businessId));
    if (customerEmail) tapConds.push(eq(taps.customerEmail, customerEmail));
    const tapWhere = tapConds.length ? and(...tapConds) : undefined;
    const rewardWhere = businessId ? eq(rewards.businessId, businessId) : undefined;

    // Core tap metrics (CHR-81: SQL aggregates instead of loading all taps).
    const [tapAgg] = await db
      .select({
        total: sql<number>`count(*)`,
        active: sql<number>`count(distinct ${taps.customerEmail}) filter (where ${taps.customerEmail} <> '')`,
        rewardValue: sql<number>`coalesce(sum(${taps.rewardValue}), 0)`,
      })
      .from(taps)
      .where(tapWhere);
    const totalTaps = Number(tapAgg?.total ?? 0);
    const activeCustomers = Number(tapAgg?.active ?? 0);
    const tapRewardValue = Number(tapAgg?.rewardValue ?? 0);

    const [rewAgg] = await db
      .select({
        issued: sql<number>`count(*)`,
        redeemed: sql<number>`count(*) filter (where ${rewards.isRedeemed})`,
      })
      .from(rewards)
      .where(rewardWhere);
    const rewardsIssued = Number(rewAgg?.issued ?? 0);
    const rewardsRedeemed = Number(rewAgg?.redeemed ?? 0);
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

    // Hourly buckets by the stored (UTC) hour. CHR-83: the previous
    // new Date(...).getHours() applied a process-local shift, mislabeling the
    // peak hour; EXTRACT(HOUR FROM created_at) uses the stored wall-clock hour.
    const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      taps: 0,
      revenue: 0,
    }));
    const hourRows = await db
      .select({
        hour: sql<number>`extract(hour from ${taps.createdAt})::int`,
        taps: sql<number>`count(*)`,
        revenue: sql<number>`coalesce(sum(${taps.rewardValue}), 0)`,
      })
      .from(taps)
      .where(tapWhere)
      .groupBy(sql`extract(hour from ${taps.createdAt})`);
    for (const r of hourRows) {
      const h = Number(r.hour);
      if (h >= 0 && h < 24) {
        hourlyData[h].taps = Number(r.taps);
        hourlyData[h].revenue = Number(r.revenue);
      }
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

    // Top campaigns by tap volume (SQL group-by, joined to campaign list in JS).
    const campTapRows = await db
      .select({
        campaignId: taps.campaignId,
        taps: sql<number>`count(*)`,
        revenue: sql<number>`coalesce(sum(${taps.rewardValue}), 0)`,
      })
      .from(taps)
      .where(
        tapWhere
          ? and(tapWhere, sql`${taps.campaignId} is not null`)
          : sql`${taps.campaignId} is not null`
      )
      .groupBy(taps.campaignId);
    const tapsByCampaign = new Map(
      campTapRows.map((r) => [r.campaignId as string, Number(r.taps)])
    );
    const revByCampaign = new Map(
      campTapRows.map((r) => [r.campaignId as string, Number(r.revenue)])
    );
    const topCampaigns = campaignRows
      .map((c) => ({
        id: c.id,
        name: c.name,
        taps: tapsByCampaign.get(c.id) ?? 0,
        revenue: Math.round((revByCampaign.get(c.id) ?? 0) * 100) / 100,
      }))
      .sort((a, b) => b.taps - a.taps)
      .slice(0, 5);

    // Top locations by tag placement (SQL tap counts per tag, mapped to labels).
    const tagLocation = new Map<string, string>();
    for (const tag of tagRows) {
      tagLocation.set(tag.id, tag.location || tag.customLabel || "Unlabeled");
    }
    const tagTapRows = await db
      .select({ tagId: taps.tagId, taps: sql<number>`count(*)` })
      .from(taps)
      .where(tapWhere)
      .groupBy(taps.tagId);
    const tapsByLocation = new Map<string, number>();
    for (const r of tagTapRows) {
      const loc = tagLocation.get(r.tagId) || "Unknown";
      tapsByLocation.set(loc, (tapsByLocation.get(loc) ?? 0) + Number(r.taps));
    }
    const topLocations = Array.from(tapsByLocation.entries())
      .map(([name, taps]) => ({
        name,
        taps,
        percentage: totalTaps > 0 ? Math.round((taps / totalTaps) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.taps - a.taps)
      .slice(0, 5);

    // Recent activity: latest taps + latest redemptions, merged by time. Only
    // the newest few of each can survive the top-6 merge, so bound each query.
    const recentTaps = await db
      .select()
      .from(taps)
      .where(tapWhere)
      .orderBy(desc(taps.createdAt))
      .limit(8);
    const tapActivity = recentTaps.map((t) => ({
      kind: "tap" as const,
      action: `Tap${t.customerName ? ` by ${t.customerName}` : ""}`,
      at: t.createdAt ? new Date(t.createdAt).getTime() : 0,
      timestamp: t.createdAt ? new Date(t.createdAt).toISOString() : null,
      value: `+${t.pointsEarned ?? 0} pts`,
    }));
    const redeemedRewards = await db
      .select()
      .from(rewards)
      .where(
        rewardWhere
          ? and(rewardWhere, eq(rewards.isRedeemed, true), sql`${rewards.redeemedAt} is not null`)
          : and(eq(rewards.isRedeemed, true), sql`${rewards.redeemedAt} is not null`)
      )
      .orderBy(desc(rewards.redeemedAt))
      .limit(8);
    const redemptionActivity = redeemedRewards.map((r) => ({
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

  // ── Cross-role messaging (Slice 1: coordinator ↔ business) ──────────────
  // A generic two-party thread engine. Threads carry both a coordinatorId and a
  // businessId; the viewer's role in a thread is "coordinator" if they own that
  // coordinator record, otherwise "business". Enrichment (counterpart name,
  // unread count, preview) is done in the route where the viewer's role is known.

  async getMessageThread(id: string): Promise<MessageThread | undefined> {
    const [row] = await db.select().from(messageThreads).where(eq(messageThreads.id, id));
    return row;
  }

  // The active coordinator responsible for a business (via its territory), or
  // undefined if the business has no territory / no active coordinator. Used to
  // route a business-initiated thread to the right coordinator.
  async getCoordinatorForBusiness(businessId: string): Promise<Coordinator | undefined> {
    const business = await this.getBusiness(businessId);
    if (!business?.territoryId) return undefined;
    const [terr] = await db.select().from(territories).where(eq(territories.id, business.territoryId));
    if (!terr) return undefined;
    const coordinator = await this.getCoordinator(terr.coordinatorId);
    if (!coordinator || coordinator.isActive === false) return undefined;
    return coordinator;
  }

  async getMessageThreadsForCoordinator(coordinatorId: string): Promise<MessageThread[]> {
    return await db
      .select()
      .from(messageThreads)
      .where(eq(messageThreads.coordinatorId, coordinatorId))
      .orderBy(desc(messageThreads.lastMessageAt));
  }

  async getMessageThreadsForBusinessIds(businessIds: string[]): Promise<MessageThread[]> {
    if (businessIds.length === 0) return [];
    return await db
      .select()
      .from(messageThreads)
      .where(inArray(messageThreads.businessId, businessIds))
      .orderBy(desc(messageThreads.lastMessageAt));
  }

  async getMessagesForThread(threadId: string): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.threadId, threadId))
      .orderBy(messages.createdAt);
  }

  // Batch fetch (ordered) for building a thread list without N+1 queries.
  async getMessagesForThreads(threadIds: string[]): Promise<Message[]> {
    if (threadIds.length === 0) return [];
    return await db
      .select()
      .from(messages)
      .where(inArray(messages.threadId, threadIds))
      .orderBy(messages.createdAt);
  }

  async createMessageThread(data: {
    subject: string;
    coordinatorId?: string | null;
    businessId?: string | null;
    customerUserId?: string | null;
    contextType?: string;
    createdBy?: string;
  }): Promise<MessageThread> {
    const [row] = await db
      .insert(messageThreads)
      .values({
        subject: data.subject,
        coordinatorId: data.coordinatorId ?? null,
        businessId: data.businessId ?? null,
        customerUserId: data.customerUserId ?? null,
        contextType: data.contextType ?? "coordinator_business",
        createdBy: data.createdBy,
        lastMessageAt: new Date(),
      })
      .returning();
    return row;
  }

  // Slice 4: threads where this user is the customer party.
  async getMessageThreadsForCustomer(customerUserId: string): Promise<MessageThread[]> {
    return await db
      .select()
      .from(messageThreads)
      .where(eq(messageThreads.customerUserId, customerUserId))
      .orderBy(desc(messageThreads.lastMessageAt));
  }

  // Has this customer (by email) favorited the business? Gates the opt-in
  // customer→business message path.
  async customerFollowsBusiness(email: string | null | undefined, businessId: string): Promise<boolean> {
    if (!email) return false;
    const ids = await this.getFavoriteBusinessIds(email, null);
    return ids.includes(businessId);
  }

  async createMessage(data: {
    threadId: string;
    senderId?: string;
    senderRole: string;
    body: string;
  }): Promise<Message> {
    const [row] = await db
      .insert(messages)
      .values({
        threadId: data.threadId,
        senderId: data.senderId,
        senderRole: data.senderRole,
        body: data.body,
      })
      .returning();
    // Bump the thread so it sorts to the top of both parties' inboxes.
    await db
      .update(messageThreads)
      .set({ lastMessageAt: new Date() })
      .where(eq(messageThreads.id, data.threadId));
    return row;
  }

  // The reader opened the thread: mark every message they did NOT send as read.
  async markThreadReadForRole(threadId: string, readerRole: string): Promise<void> {
    await db
      .update(messages)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(messages.threadId, threadId),
          isNull(messages.readAt),
          sql`${messages.senderRole} <> ${readerRole}`,
        ),
      );
  }

  // Slice 2: admin support threads (context_type='admin_support') reuse the same
  // tables — admin↔business sets businessId, admin↔coordinator sets coordinatorId.
  async getAdminSupportThreads(): Promise<MessageThread[]> {
    return await db
      .select()
      .from(messageThreads)
      .where(eq(messageThreads.contextType, "admin_support"))
      .orderBy(desc(messageThreads.lastMessageAt));
  }

  // Is this user an active platform admin? (For "admin" role in support threads.)
  async isPlatformAdmin(userId: string): Promise<boolean> {
    const [admin] = await db.select().from(adminUsers).where(eq(adminUsers.userId, userId));
    return !!admin && admin.isActive !== false;
  }

  // ── Admin broadcasts (Slice 2) ──────────────────────────────────────────
  async createBroadcast(data: {
    senderUserId?: string;
    audience: string;
    subject: string;
    body: string;
  }): Promise<Broadcast> {
    const [row] = await db.insert(broadcasts).values(data).returning();
    return row;
  }

  async getSentBroadcasts(): Promise<Broadcast[]> {
    return await db.select().from(broadcasts).orderBy(desc(broadcasts.createdAt));
  }

  // The broadcasts a user should see: platform-wide ('all') plus any addressed to
  // one of their role buckets (e.g. 'coordinators', 'businesses', 'customers').
  async getBroadcastFeed(roleBuckets: string[]): Promise<Broadcast[]> {
    const audiences = Array.from(new Set(["all", ...roleBuckets]));
    return await db
      .select()
      .from(broadcasts)
      .where(inArray(broadcasts.audience, audiences))
      .orderBy(desc(broadcasts.createdAt));
  }

  async getBroadcastLastSeen(userId: string): Promise<Date | null> {
    const [row] = await db
      .select()
      .from(userBroadcastState)
      .where(eq(userBroadcastState.userId, userId));
    return row?.lastSeenAt ?? null;
  }

  // Upsert the per-user watermark to now (they opened their announcements).
  async markBroadcastsSeen(userId: string): Promise<void> {
    await db
      .insert(userBroadcastState)
      .values({ userId, lastSeenAt: new Date() })
      .onConflictDoUpdate({ target: userBroadcastState.userId, set: { lastSeenAt: new Date() } });
  }

  // ── Shared-campaign reward cost splitting (tap-weighted) ──────────────────
  // When a funded group reward is unlocked, split its cost across the stores the
  // customer actually visited on the trail, weighted by taps. The host fronted
  // the item and keeps its own share; each other visited store owes its share to
  // the host. Idempotent per (reward, business).
  async accrueRewardContributions(input: {
    groupCampaignId: string;
    rewardId: string;
    hostBusinessId: string;
    visitedBusinessIds: string[];
    customerEmail: string | null | undefined;
    totalRewardCents: number;
  }): Promise<void> {
    const { groupCampaignId, rewardId, hostBusinessId, visitedBusinessIds, customerEmail, totalRewardCents } = input;
    if (totalRewardCents <= 0) return;
    const participants = Array.from(new Set(visitedBusinessIds));
    if (participants.length === 0) return;

    // Weight = taps by this customer at each visited store (>=1 since visited).
    const weights = new Map<string, number>();
    for (const bid of participants) {
      const taps = customerEmail ? await this.getTaps(bid, customerEmail) : [];
      weights.set(bid, Math.max(1, taps.length));
    }
    const denom = participants.reduce((s, b) => s + (weights.get(b) ?? 1), 0);
    const hostWeight = participants.includes(hostBusinessId) ? (weights.get(hostBusinessId) ?? 1) : 0;
    const hostShare = Math.round((totalRewardCents * hostWeight) / denom);
    const pool = totalRewardCents - hostShare; // owed collectively by non-host drivers

    const drivers = participants.filter((b) => b !== hostBusinessId);
    if (drivers.length === 0 || pool <= 0) return;
    const driverWeightSum = drivers.reduce((s, b) => s + (weights.get(b) ?? 1), 0);

    const period = new Date().toISOString().slice(0, 7); // YYYY-MM
    let allocated = 0;
    const rows = drivers.map((bid, i) => {
      const w = weights.get(bid) ?? 1;
      // Exact integer split: floor each, last driver absorbs the remainder.
      const share = i === drivers.length - 1
        ? pool - allocated
        : Math.floor((pool * w) / driverWeightSum);
      allocated += share;
      return {
        groupCampaignId,
        rewardId,
        hostBusinessId,
        businessId: bid,
        customerEmail: customerEmail ?? null,
        weightTaps: w,
        totalRewardCents,
        shareCents: share,
        basis: "weighted",
        periodMonth: period,
      };
    });
    // Idempotent: the unique (reward_id, business_id) constraint dedupes retries.
    await db.insert(rewardContributions).values(rows).onConflictDoNothing();
  }

  async getContributionsOwedToHost(hostBusinessId: string, unsettledOnly = false): Promise<RewardContribution[]> {
    const conds = [eq(rewardContributions.hostBusinessId, hostBusinessId)];
    if (unsettledOnly) conds.push(isNull(rewardContributions.settlementId));
    return await db.select().from(rewardContributions).where(and(...conds)).orderBy(desc(rewardContributions.createdAt));
  }

  async getContributionsOwedByBusiness(businessId: string, unsettledOnly = false): Promise<RewardContribution[]> {
    const conds = [eq(rewardContributions.businessId, businessId)];
    if (unsettledOnly) conds.push(isNull(rewardContributions.settlementId));
    return await db.select().from(rewardContributions).where(and(...conds)).orderBy(desc(rewardContributions.createdAt));
  }

  // Roll all unsettled contributions owed to a host in a period into one
  // settlement statement (mirrors generateCoordinatorPayout). Null if nothing due.
  async generateRewardSettlement(
    hostBusinessId: string,
    periodMonth: string,
    createdBy?: string | null,
  ): Promise<RewardSettlement | null> {
    const pending = await db
      .select()
      .from(rewardContributions)
      .where(and(
        eq(rewardContributions.hostBusinessId, hostBusinessId),
        eq(rewardContributions.periodMonth, periodMonth),
        isNull(rewardContributions.settlementId),
      ));
    if (pending.length === 0) return null;
    const totalCents = pending.reduce((s, c) => s + (c.shareCents ?? 0), 0);
    const [settlement] = await db
      .insert(rewardSettlements)
      .values({
        hostBusinessId,
        periodMonth,
        totalCents,
        contributionCount: pending.length,
        createdBy: createdBy ?? null,
      })
      .returning();
    await db
      .update(rewardContributions)
      .set({ settlementId: settlement.id })
      .where(inArray(rewardContributions.id, pending.map((c) => c.id)));
    return settlement;
  }

  async getRewardSettlement(id: string): Promise<RewardSettlement | undefined> {
    const [row] = await db.select().from(rewardSettlements).where(eq(rewardSettlements.id, id));
    return row;
  }

  async updateRewardSettlement(
    id: string,
    patch: { status?: string; reference?: string; notes?: string; method?: string; stripeTransferId?: string },
  ): Promise<RewardSettlement> {
    const [row] = await db
      .update(rewardSettlements)
      .set({
        ...(patch.status ? { status: patch.status, paidAt: patch.status === "paid" ? new Date() : null } : {}),
        ...(patch.reference !== undefined ? { reference: patch.reference } : {}),
        ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
        ...(patch.method !== undefined ? { method: patch.method } : {}),
        ...(patch.stripeTransferId !== undefined ? { stripeTransferId: patch.stripeTransferId } : {}),
      })
      .where(eq(rewardSettlements.id, id))
      .returning();
    // If voided, release its contributions so they can be re-settled.
    if (patch.status === "void") {
      await db.update(rewardContributions).set({ settlementId: null }).where(eq(rewardContributions.settlementId, id));
    }
    return row;
  }

  async getRewardSettlementsForHosts(hostBusinessIds: string[]): Promise<RewardSettlement[]> {
    if (hostBusinessIds.length === 0) return [];
    return await db
      .select()
      .from(rewardSettlements)
      .where(inArray(rewardSettlements.hostBusinessId, hostBusinessIds))
      .orderBy(desc(rewardSettlements.createdAt));
  }

  async getAllRewardSettlements(): Promise<RewardSettlement[]> {
    return await db.select().from(rewardSettlements).orderBy(desc(rewardSettlements.createdAt));
  }

  // Unsettled contributions, optionally scoped to a set of host businesses
  // (null = all, for admin). Used to build the "owed to host" pending view.
  async getUnsettledContributions(hostBusinessIds: string[] | null): Promise<RewardContribution[]> {
    const conds = [isNull(rewardContributions.settlementId)];
    if (hostBusinessIds) {
      if (hostBusinessIds.length === 0) return [];
      conds.push(inArray(rewardContributions.hostBusinessId, hostBusinessIds));
    }
    return await db
      .select()
      .from(rewardContributions)
      .where(and(...conds))
      .orderBy(desc(rewardContributions.createdAt));
  }

  // ── Badges (recognition) ──────────────────────────────────────────────────
  // Catalog definitions that a given role may grant (optionally for a specific
  // audience). Excludes custom badges made by OTHER users.
  async getBadgeCatalog(awardableBy: string, audience?: string): Promise<BadgeDefinition[]> {
    const conds = [eq(badgeDefinitions.awardableBy, awardableBy)];
    if (audience) conds.push(or(eq(badgeDefinitions.audience, audience), eq(badgeDefinitions.audience, "any"))!);
    return await db.select().from(badgeDefinitions).where(and(...conds)).orderBy(badgeDefinitions.name);
  }

  async getBadgeDefinition(id: string): Promise<BadgeDefinition | undefined> {
    const [row] = await db.select().from(badgeDefinitions).where(eq(badgeDefinitions.id, id));
    return row;
  }

  async createCustomBadge(input: {
    name: string;
    description?: string | null;
    emoji?: string | null;
    imageDataUri?: string | null;
    color?: string | null;
    audience: string;
    awardableBy: string;
    createdByUserId: string;
  }): Promise<BadgeDefinition> {
    const [row] = await db
      .insert(badgeDefinitions)
      .values({
        key: `custom_${crypto.randomUUID()}`,
        name: input.name,
        description: input.description ?? null,
        emoji: input.emoji ?? null,
        imageDataUri: input.imageDataUri ?? null,
        color: input.color ?? "#7c3aed",
        audience: input.audience,
        awardableBy: input.awardableBy,
        isCustom: true,
        createdByUserId: input.createdByUserId,
      })
      .returning();
    return row;
  }

  // Has this awarder already given this exact badge to this recipient? (dedup)
  async hasBadgeAward(input: {
    badgeDefinitionId: string;
    recipientUserId?: string | null;
    recipientBusinessId?: string | null;
    awarderUserId?: string | null;
  }): Promise<boolean> {
    const conds = [
      eq(badgeAwards.badgeDefinitionId, input.badgeDefinitionId),
      isNull(badgeAwards.revokedAt),
    ];
    if (input.recipientUserId) conds.push(eq(badgeAwards.recipientUserId, input.recipientUserId));
    if (input.recipientBusinessId) conds.push(eq(badgeAwards.recipientBusinessId, input.recipientBusinessId));
    if (input.awarderUserId) conds.push(eq(badgeAwards.awarderUserId, input.awarderUserId));
    const [row] = await db.select({ id: badgeAwards.id }).from(badgeAwards).where(and(...conds)).limit(1);
    return !!row;
  }

  async awardBadge(input: {
    badgeDefinitionId: string;
    recipientUserId?: string | null;
    recipientBusinessId?: string | null;
    note?: string | null;
    awarderRole: string;
    awarderUserId?: string | null;
    awarderBusinessId?: string | null;
  }): Promise<BadgeAward> {
    const [row] = await db.insert(badgeAwards).values(input).returning();
    return row;
  }

  async getBadgeAward(id: string): Promise<BadgeAward | undefined> {
    const [row] = await db.select().from(badgeAwards).where(eq(badgeAwards.id, id));
    return row;
  }

  async revokeBadgeAward(id: string): Promise<void> {
    await db.update(badgeAwards).set({ revokedAt: new Date() }).where(eq(badgeAwards.id, id));
  }

  // Active awards for a recipient, joined with the definition's visual info.
  private async awardsWith(where: any): Promise<any[]> {
    return await db
      .select({
        id: badgeAwards.id,
        note: badgeAwards.note,
        awarderRole: badgeAwards.awarderRole,
        awarderUserId: badgeAwards.awarderUserId,
        awarderBusinessId: badgeAwards.awarderBusinessId,
        awardedAt: badgeAwards.awardedAt,
        badgeDefinitionId: badgeAwards.badgeDefinitionId,
        name: badgeDefinitions.name,
        description: badgeDefinitions.description,
        emoji: badgeDefinitions.emoji,
        imageDataUri: badgeDefinitions.imageDataUri,
        color: badgeDefinitions.color,
        isCustom: badgeDefinitions.isCustom,
      })
      .from(badgeAwards)
      .innerJoin(badgeDefinitions, eq(badgeAwards.badgeDefinitionId, badgeDefinitions.id))
      .where(and(where, isNull(badgeAwards.revokedAt)))
      .orderBy(desc(badgeAwards.awardedAt));
  }

  async getBadgeAwardsForUser(userId: string): Promise<any[]> {
    return this.awardsWith(eq(badgeAwards.recipientUserId, userId));
  }

  async getBadgeAwardsForBusiness(businessId: string): Promise<any[]> {
    return this.awardsWith(eq(badgeAwards.recipientBusinessId, businessId));
  }

  // ── Points economy (redemption) ───────────────────────────────────────────
  // Atomically deduct points only if the balance covers the cost. Returns the
  // new available balance, or null if there weren't enough points.
  async spendCustomerPoints(userId: string, cost: number): Promise<number | null> {
    const [row] = await db
      .update(users)
      .set({ availablePoints: sql`${users.availablePoints} - ${cost}`, updatedAt: new Date() })
      .where(and(eq(users.id, userId), sql`COALESCE(${users.availablePoints}, 0) >= ${cost}`))
      .returning({ availablePoints: users.availablePoints });
    return row ? (row.availablePoints ?? 0) : null;
  }

  // Refund points (used if issuing the reward fails after deduction).
  async refundCustomerPoints(userId: string, amount: number): Promise<void> {
    await db.update(users)
      .set({ availablePoints: sql`COALESCE(${users.availablePoints}, 0) + ${amount}`, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async createPointReward(data: {
    title: string; description?: string | null; emoji?: string | null; pointsCost: number;
    type: string; businessId?: string | null; createdByUserId: string; createdByRole: string;
    quantity?: number | null; drawAt?: Date | null;
  }): Promise<PointReward> {
    const [row] = await db.insert(pointRewards).values(data).returning();
    return row;
  }

  async getPointReward(id: string): Promise<PointReward | undefined> {
    const [row] = await db.select().from(pointRewards).where(eq(pointRewards.id, id));
    return row;
  }

  // Active, in-stock, unexpired catalog (with business name for perks).
  async getActivePointRewards(): Promise<any[]> {
    const rows = await db.select().from(pointRewards)
      .where(eq(pointRewards.isActive, true))
      .orderBy(desc(pointRewards.createdAt));
    const now = Date.now();
    const live = rows.filter((r) =>
      (r.quantity == null || (r.redeemedCount ?? 0) < r.quantity) &&
      (!r.endsAt || new Date(r.endsAt).getTime() > now) &&
      !r.winnerRedemptionId);
    const bizNames = new Map<string, string>();
    await Promise.all(Array.from(new Set(live.map((r) => r.businessId).filter(Boolean))).map(async (id) => {
      const b = await this.getBusiness(id as string); if (b) bizNames.set(id as string, b.name);
    }));
    return live.map((r) => ({ ...r, businessName: r.businessId ? (bizNames.get(r.businessId) || "A business") : null }));
  }

  async getPointRewardsByBusiness(businessId: string): Promise<PointReward[]> {
    return await db.select().from(pointRewards).where(eq(pointRewards.businessId, businessId)).orderBy(desc(pointRewards.createdAt));
  }

  async getAllPointRewards(): Promise<PointReward[]> {
    return await db.select().from(pointRewards).orderBy(desc(pointRewards.createdAt));
  }

  async deactivatePointReward(id: string): Promise<void> {
    await db.update(pointRewards).set({ isActive: false }).where(eq(pointRewards.id, id));
  }

  async incrementPointRewardRedeemed(id: string): Promise<void> {
    await db.update(pointRewards).set({ redeemedCount: sql`${pointRewards.redeemedCount} + 1` }).where(eq(pointRewards.id, id));
  }

  async createPointRedemption(data: {
    pointRewardId: string; userId: string; pointsSpent: number;
    rewardId?: string | null; code?: string | null; status: string;
  }): Promise<PointRedemption> {
    const [row] = await db.insert(pointRedemptions).values(data).returning();
    return row;
  }

  // A user's redemption history, joined with the reward's display info.
  async getPointRedemptionsForUser(userId: string): Promise<any[]> {
    return await db
      .select({
        id: pointRedemptions.id,
        title: pointRewards.title,
        emoji: pointRewards.emoji,
        type: pointRewards.type,
        pointsSpent: pointRedemptions.pointsSpent,
        code: pointRedemptions.code,
        status: pointRedemptions.status,
        createdAt: pointRedemptions.createdAt,
      })
      .from(pointRedemptions)
      .innerJoin(pointRewards, eq(pointRedemptions.pointRewardId, pointRewards.id))
      .where(eq(pointRedemptions.userId, userId))
      .orderBy(desc(pointRedemptions.createdAt));
  }

  async getPointRedemptionsForReward(pointRewardId: string): Promise<PointRedemption[]> {
    return await db.select().from(pointRedemptions).where(eq(pointRedemptions.pointRewardId, pointRewardId));
  }

  // Pick a random winner among a prize draw's entries; mark won/lost + close it.
  async drawPrizeWinner(pointRewardId: string): Promise<{ winnerUserId: string } | null> {
    const entries = await db.select().from(pointRedemptions)
      .where(and(eq(pointRedemptions.pointRewardId, pointRewardId), eq(pointRedemptions.status, "entered")));
    if (entries.length === 0) return null;
    const winner = entries[Math.floor(Math.random() * entries.length)];
    await db.update(pointRedemptions).set({ status: "lost" })
      .where(and(eq(pointRedemptions.pointRewardId, pointRewardId), eq(pointRedemptions.status, "entered")));
    await db.update(pointRedemptions).set({ status: "won" }).where(eq(pointRedemptions.id, winner.id));
    await db.update(pointRewards).set({ winnerRedemptionId: winner.id, isActive: false }).where(eq(pointRewards.id, pointRewardId));
    return { winnerUserId: winner.userId };
  }
}

export const storage = new DatabaseStorage();