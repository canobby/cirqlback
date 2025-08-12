import { sql } from 'drizzle-orm';
import { pgTable, varchar, integer, timestamp, jsonb, text, boolean, decimal } from "drizzle-orm/pg-core";

// AR Game Sessions - track active game sessions
export const arGameSessions = pgTable("ar_game_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  businessId: varchar("business_id").notNull(),
  sessionType: varchar("session_type").notNull(), // treasure_hunt, social_challenge, skill_quest, team_battle
  gameData: jsonb("game_data"), // dynamic game state
  score: integer("score").default(0),
  experienceGained: integer("experience_gained").default(0),
  itemsCollected: text("items_collected").array().default(sql`'{}'`),
  achievements: text("achievements").array().default(sql`'{}'`),
  isCompleted: boolean("is_completed").default(false),
  duration: integer("duration"), // in minutes
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Avatar Customizations - track avatar appearance and unlocks
export const avatarCustomizations = pgTable("avatar_customizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  avatarType: varchar("avatar_type").notNull(), // chef, athlete, artist, explorer, social_butterfly
  appearance: jsonb("appearance"), // hair, clothes, accessories, colors
  unlockedItems: text("unlocked_items").array().default(sql`'{}'`),
  equippedItems: jsonb("equipped_items"),
  specialEffects: text("special_effects").array().default(sql`'{}'`),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// AR Collectibles - virtual items found at businesses
export const arCollectibles = pgTable("ar_collectibles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  category: varchar("category").notNull(), // ingredient, tool, artwork, memory, power_up
  rarity: varchar("rarity").notNull(), // common, rare, epic, legendary
  description: text("description"),
  businessType: varchar("business_type"), // coffee_shop, restaurant, gym, etc.
  effectType: varchar("effect_type"), // experience_boost, skill_boost, social_bonus
  effectValue: integer("effect_value"),
  model3dUrl: varchar("model_3d_url"),
  animationUrl: varchar("animation_url"),
  soundUrl: varchar("sound_url"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// User Collectibles - track what users have collected
export const userCollectibles = pgTable("user_collectibles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  collectibleId: varchar("collectible_id").notNull(),
  businessId: varchar("business_id"), // where it was found
  quantity: integer("quantity").default(1),
  firstFoundAt: timestamp("first_found_at").defaultNow(),
  lastFoundAt: timestamp("last_found_at").defaultNow(),
});

// AR Challenges - location-specific AR experiences
export const arChallenges = pgTable("ar_challenges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull(),
  name: varchar("name").notNull(),
  description: text("description"),
  challengeType: varchar("challenge_type").notNull(), // cooking_quest, fitness_challenge, art_creation, social_meetup
  difficulty: varchar("difficulty").notNull(), // easy, medium, hard, expert
  requiredSkillLevel: integer("required_skill_level").default(1),
  experienceReward: integer("experience_reward").default(100),
  collectibleRewards: text("collectible_rewards").array().default(sql`'{}'`),
  badgeReward: varchar("badge_reward"),
  timeLimit: integer("time_limit"), // in minutes
  maxParticipants: integer("max_participants"),
  isTeamChallenge: boolean("is_team_challenge").default(false),
  arModel: varchar("ar_model"), // 3D model reference
  interactionType: varchar("interaction_type"), // tap, gesture, voice, movement
  gameInstructions: jsonb("game_instructions"),
  isActive: boolean("is_active").default(true),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Challenge Participations - track user participation
export const challengeParticipations = pgTable("challenge_participations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  challengeId: varchar("challenge_id").notNull(),
  userId: varchar("user_id").notNull(),
  teamId: varchar("team_id"),
  score: integer("score").default(0),
  completionTime: integer("completion_time"), // in seconds
  skillsUsed: text("skills_used").array().default(sql`'{}'`),
  isCompleted: boolean("is_completed").default(false),
  rank: integer("rank"),
  experienceGained: integer("experience_gained").default(0),
  itemsCollected: text("items_collected").array().default(sql`'{}'`),
  socialInteractions: integer("social_interactions").default(0),
  participatedAt: timestamp("participated_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// AR Social Interactions - track social elements
export const arSocialInteractions = pgTable("ar_social_interactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fromUserId: varchar("from_user_id").notNull(),
  toUserId: varchar("to_user_id").notNull(),
  businessId: varchar("business_id").notNull(),
  interactionType: varchar("interaction_type").notNull(), // avatar_meetup, item_trade, skill_share, team_invite
  interactionData: jsonb("interaction_data"),
  experienceGained: integer("experience_gained").default(0),
  socialBonus: integer("social_bonus").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Avatar Skills Progress - track skill development
export const avatarSkillsProgress = pgTable("avatar_skills_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  skillType: varchar("skill_type").notNull(), // cooking, fitness, art, social, explorer, business_savvy
  currentLevel: integer("current_level").default(1),
  currentExperience: integer("current_experience").default(0),
  totalExperience: integer("total_experience").default(0),
  skillBoosts: jsonb("skill_boosts"), // temporary boosts from items/businesses
  unlockedAbilities: text("unlocked_abilities").array().default(sql`'{}'`),
  businessesVisited: text("businesses_visited").array().default(sql`'{}'`), // for skill context
  lastUpdated: timestamp("last_updated").defaultNow(),
});

// AR Business Enhancements - business-specific AR features
export const arBusinessEnhancements = pgTable("ar_business_enhancements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull(),
  enhancementType: varchar("enhancement_type").notNull(), // virtual_menu, skill_station, collectible_spawn, social_hub
  enhancementData: jsonb("enhancement_data"),
  arModels: text("ar_models").array().default(sql`'{}'`),
  triggerType: varchar("trigger_type").notNull(), // proximity, scan, tap, voice
  skillBoosts: jsonb("skill_boosts"), // skills this business can enhance
  collectibleSpawns: text("collectible_spawns").array().default(sql`'{}'`),
  socialFeatures: jsonb("social_features"), // meetup spots, team challenges
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export type ARGameSession = typeof arGameSessions.$inferSelect;
export type AvatarCustomization = typeof avatarCustomizations.$inferSelect;
export type ARCollectible = typeof arCollectibles.$inferSelect;
export type UserCollectible = typeof userCollectibles.$inferSelect;
export type ARChallenge = typeof arChallenges.$inferSelect;
export type ChallengeParticipation = typeof challengeParticipations.$inferSelect;
export type ARSocialInteraction = typeof arSocialInteractions.$inferSelect;
export type AvatarSkillsProgress = typeof avatarSkillsProgress.$inferSelect;
export type ARBusinessEnhancement = typeof arBusinessEnhancements.$inferSelect;