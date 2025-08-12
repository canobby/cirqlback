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
  userAvatars,
  avatarAssets,
  userAvatarAssets,
  avatarAchievements,
  userAvatarAchievements,
  avatarInteractions,
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
  type UserAvatar,
  type InsertUserAvatar,
  type AvatarAsset,
  type InsertAvatarAsset,
  type AvatarAchievement,
  type AvatarInteraction,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, count } from "drizzle-orm";

export interface IStorage {
  // User operations (required for auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
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
  
  // Tap operations
  processTap(tap: InsertTap): Promise<{ success: boolean; reward?: Reward; message: string }>;
  getTaps(businessId?: string, customerEmail?: string): Promise<Tap[]>;
  
  // Reward operations
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
  getBusinessAnalytics(businessId: string): Promise<any>;
  getUserActivity(userId: string): Promise<any>;
  getCustomerInsights(businessId: string): Promise<any>;
  
  // Avatar operations
  getUserAvatar(userId: string): Promise<UserAvatar | undefined>;
  createUserAvatar(avatar: InsertUserAvatar): Promise<UserAvatar>;
  updateUserAvatar(userId: string, updates: Partial<UserAvatar>): Promise<UserAvatar>;
  getAvatarAssets(): Promise<AvatarAsset[]>;
  getUserAvatarAssets(userId: string): Promise<string[]>;
  purchaseAvatarAsset(userId: string, assetId: string): Promise<void>;
  getAvatarAchievements(): Promise<AvatarAchievement[]>;
  getUserAvatarAchievements(userId: string): Promise<any[]>;
  recordAvatarInteraction(interaction: Omit<AvatarInteraction, 'id' | 'createdAt'>): Promise<void>;
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

  // Tap operations
  async processTap(tap: InsertTap): Promise<{ success: boolean; reward?: Reward; message: string }> {
    try {
      // Create the tap record
      const [newTap] = await db.insert(taps).values(tap).returning();

      // Update tag tap count
      await db
        .update(nfcTags)
        .set({ totalTaps: sql`${nfcTags.totalTaps} + 1` })
        .where(eq(nfcTags.id, tap.tagId));

      // Update business tap count
      await db
        .update(businesses)
        .set({ totalTaps: sql`${businesses.totalTaps} + 1` })
        .where(eq(businesses.id, tap.businessId));

      // Create reward if campaign is associated
      let reward: Reward | undefined;
      if (tap.campaignId) {
        const campaign = await this.getCampaign(tap.campaignId);
        if (campaign && campaign.isActive) {
          const rewardData: InsertReward = {
            businessId: tap.businessId,
            campaignId: tap.campaignId,
            tapId: newTap.id,
            type: campaign.type,
            title: `${campaign.name} Reward`,
            description: campaign.description || `Reward from ${campaign.name}`,
            value: campaign.value,
            code: `CIRQ${Date.now()}`,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          };

          const [newReward] = await db.insert(rewards).values(rewardData).returning();
          reward = newReward;

          // Update campaign redemption count
          await db
            .update(campaigns)
            .set({ currentRedemptions: sql`${campaigns.currentRedemptions} + 1` })
            .where(eq(campaigns.id, tap.campaignId));
        }
      }

      return {
        success: true,
        reward,
        message: reward ? "Tap successful! Reward earned." : "Tap recorded successfully.",
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
    let query = db.select().from(taps);
    
    if (businessId && customerEmail) {
      query = query.where(
        and(eq(taps.businessId, businessId), eq(taps.customerEmail, customerEmail))
      );
    } else if (businessId) {
      query = query.where(eq(taps.businessId, businessId));
    } else if (customerEmail) {
      query = query.where(eq(taps.customerEmail, customerEmail));
    }

    return await query.orderBy(desc(taps.createdAt));
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

  // Avatar operations
  async getUserAvatar(userId: string): Promise<UserAvatar | undefined> {
    try {
      const [avatar] = await db.select().from(userAvatars).where(eq(userAvatars.userId, userId));
      return avatar || undefined;
    } catch (error) {
      console.error("Error getting user avatar:", error);
      return undefined;
    }
  }

  async createUserAvatar(avatar: InsertUserAvatar): Promise<UserAvatar> {
    const [newAvatar] = await db.insert(userAvatars).values(avatar).returning();
    return newAvatar;
  }

  async updateUserAvatar(userId: string, updates: Partial<UserAvatar>): Promise<UserAvatar> {
    const [updatedAvatar] = await db
      .update(userAvatars)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(userAvatars.userId, userId))
      .returning();
    return updatedAvatar;
  }

  async getAvatarAssets(): Promise<AvatarAsset[]> {
    try {
      return await db.select().from(avatarAssets).where(eq(avatarAssets.isActive, true));
    } catch (error) {
      console.error("Error getting avatar assets:", error);
      return [];
    }
  }

  async getUserAvatarAssets(userId: string): Promise<string[]> {
    try {
      const assets = await db
        .select({ assetId: userAvatarAssets.assetId })
        .from(userAvatarAssets)
        .where(eq(userAvatarAssets.userId, userId));
      return assets.map(asset => asset.assetId!);
    } catch (error) {
      console.error("Error getting user avatar assets:", error);
      return [];
    }
  }

  async purchaseAvatarAsset(userId: string, assetId: string): Promise<void> {
    await db.insert(userAvatarAssets).values({
      userId,
      assetId,
    });
  }

  async getAvatarAchievements(): Promise<AvatarAchievement[]> {
    try {
      return await db.select().from(avatarAchievements).where(eq(avatarAchievements.isActive, true));
    } catch (error) {
      console.error("Error getting avatar achievements:", error);
      return [];
    }
  }

  async getUserAvatarAchievements(userId: string): Promise<any[]> {
    try {
      const achievements = await db
        .select({
          achievementId: userAvatarAchievements.achievementId,
          progress: userAvatarAchievements.progress,
          completed: userAvatarAchievements.completed,
          completedAt: userAvatarAchievements.completedAt,
          title: avatarAchievements.title,
          description: avatarAchievements.description,
          target: avatarAchievements.target,
          reward: avatarAchievements.reward,
          rarity: avatarAchievements.rarity,
        })
        .from(userAvatarAchievements)
        .innerJoin(avatarAchievements, eq(userAvatarAchievements.achievementId, avatarAchievements.id))
        .where(eq(userAvatarAchievements.userId, userId));
      return achievements;
    } catch (error) {
      console.error("Error getting user avatar achievements:", error);
      return [];
    }
  }

  async recordAvatarInteraction(interaction: Omit<AvatarInteraction, 'id' | 'createdAt'>): Promise<void> {
    try {
      await db.insert(avatarInteractions).values(interaction);
    } catch (error) {
      console.error("Error recording avatar interaction:", error);
    }
  }

  // Placeholder analytics methods
  async getBusinessAnalytics(businessId: string): Promise<any> {
    return { businessId, analytics: "placeholder" };
  }

  async getUserActivity(userId: string): Promise<any> {
    return { userId, activity: "placeholder" };
  }

  async getCustomerInsights(businessId: string): Promise<any> {
    return { businessId, insights: "placeholder" };
  }

  // Avatar operations
  async getUserAvatar(userId: string): Promise<UserAvatar | undefined> {
    try {
      const [avatar] = await db.select().from(userAvatars).where(eq(userAvatars.userId, userId));
      return avatar || undefined;
    } catch (error) {
      console.error("Database error in getUserAvatar:", error);
      return undefined;
    }
  }

  async createUserAvatar(avatar: InsertUserAvatar): Promise<UserAvatar> {
    const [newAvatar] = await db
      .insert(userAvatars)
      .values(avatar)
      .returning();
    return newAvatar;
  }

  async updateUserAvatar(userId: string, updates: Partial<UserAvatar>): Promise<UserAvatar> {
    const [updated] = await db
      .update(userAvatars)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(userAvatars.userId, userId))
      .returning();
    return updated;
  }

  async getAvatarAssets(): Promise<AvatarAsset[]> {
    try {
      return await db.select().from(avatarAssets);
    } catch (error) {
      console.error("Database error in getAvatarAssets:", error);
      return [];
    }
  }

  async getUserAvatarAssets(userId: string): Promise<string[]> {
    try {
      const assets = await db
        .select({ assetId: userAvatarAssets.assetId })
        .from(userAvatarAssets)
        .where(eq(userAvatarAssets.userId, userId));
      return assets.map(asset => asset.assetId);
    } catch (error) {
      console.error("Database error in getUserAvatarAssets:", error);
      return [];
    }
  }

  async purchaseAvatarAsset(userId: string, assetId: string): Promise<void> {
    await db.insert(userAvatarAssets).values({
      userId,
      assetId,
      purchasedAt: new Date()
    });
  }

  async getAvatarAchievements(): Promise<AvatarAchievement[]> {
    try {
      return await db.select().from(avatarAchievements);
    } catch (error) {
      console.error("Database error in getAvatarAchievements:", error);
      return [];
    }
  }

  async getUserAvatarAchievements(userId: string): Promise<any[]> {
    try {
      const achievements = await db
        .select()
        .from(userAvatarAchievements)
        .where(eq(userAvatarAchievements.userId, userId));
      return achievements;
    } catch (error) {
      console.error("Database error in getUserAvatarAchievements:", error);
      return [];
    }
  }

  async recordAvatarInteraction(interaction: Omit<AvatarInteraction, 'id' | 'createdAt'>): Promise<void> {
    await db.insert(avatarInteractions).values({
      ...interaction,
      createdAt: new Date()
    });
  }
}

export const storage = new DatabaseStorage();