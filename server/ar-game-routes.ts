import type { Express } from "express";

export function registerARGameRoutes(app: Express) {
  // AR Game Session Management
  app.post("/api/ar/session/start", async (req, res) => {
    try {
      const { userId, businessId, sessionType } = req.body;
      
      const session = {
        id: `session_${Date.now()}`,
        userId,
        businessId,
        sessionType, // treasure_hunt, social_challenge, skill_quest, team_battle
        gameData: {},
        score: 0,
        experienceGained: 0,
        itemsCollected: [],
        achievements: [],
        isCompleted: false,
        startedAt: new Date()
      };
      
      res.json({ success: true, session });
    } catch (error) {
      res.status(500).json({ error: "Failed to start AR session" });
    }
  });

  // Avatar Skill Progression
  app.get("/api/avatar/skills/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      
      const skills = {
        cooking: { level: 7, xp: 1200, nextLevelXP: 1500, abilities: ["Recipe Master", "Flavor Enhancer"] },
        fitness: { level: 4, xp: 600, nextLevelXP: 800, abilities: ["Strength Boost", "Endurance"] },
        art: { level: 6, xp: 950, nextLevelXP: 1200, abilities: ["Color Theory", "Creative Vision"] },
        social: { level: 8, xp: 1400, nextLevelXP: 1800, abilities: ["Team Leader", "Community Builder"] },
        explorer: { level: 9, xp: 1800, nextLevelXP: 2000, abilities: ["Hidden Finder", "Trail Blazer"] },
        business_savvy: { level: 3, xp: 450, nextLevelXP: 600, abilities: ["Deal Spotter", "Local Expert"] }
      };
      
      res.json({ skills });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch avatar skills" });
    }
  });

  // Collectible System
  app.get("/api/collectibles/available/:businessId", async (req, res) => {
    try {
      const { businessId } = req.params;
      
      const collectibles = [
        {
          id: "collect_1",
          name: "Golden Coffee Bean",
          category: "ingredient",
          rarity: "legendary",
          description: "A mystical coffee bean that boosts all skill experience",
          businessType: "coffee_shop",
          effectType: "experience_boost",
          effectValue: 50,
          model3dUrl: "/models/golden_bean.glb",
          spawnChance: 0.05
        },
        {
          id: "collect_2",
          name: "Artistic Brush",
          category: "tool",
          rarity: "epic",
          description: "Enhances creativity and artistic skill development",
          businessType: "art_studio",
          effectType: "skill_boost",
          effectValue: 25,
          model3dUrl: "/models/magic_brush.glb",
          spawnChance: 0.15
        },
        {
          id: "collect_3",
          name: "Friendship Badge",
          category: "memory",
          rarity: "rare",
          description: "Increases social interactions and team bonuses",
          businessType: "any",
          effectType: "social_bonus",
          effectValue: 20,
          model3dUrl: "/models/friendship_badge.glb",
          spawnChance: 0.25
        }
      ];
      
      res.json({ collectibles });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch collectibles" });
    }
  });

  // AR Challenges
  app.get("/api/ar/challenges/active", async (req, res) => {
    try {
      const challenges = [
        {
          id: "ar_challenge_1",
          businessId: "business_1",
          name: "The Great Pizza Challenge",
          description: "Master the art of pizza making in this immersive AR cooking experience",
          challengeType: "cooking_quest",
          difficulty: "medium",
          requiredSkillLevel: 5,
          experienceReward: 200,
          collectibleRewards: ["Golden Spatula", "Chef's Hat"],
          badgeReward: "Pizza Master",
          timeLimit: 30,
          maxParticipants: 20,
          currentParticipants: 12,
          isTeamChallenge: false,
          arModel: "pizza_kitchen.glb",
          interactionType: "gesture",
          gameInstructions: {
            steps: [
              "Scan the QR code to enter the virtual kitchen",
              "Follow the holographic chef's instructions",
              "Use hand gestures to mix ingredients",
              "Time your cooking perfectly for maximum score"
            ],
            scoringCriteria: ["Speed", "Accuracy", "Creativity", "Presentation"]
          }
        },
        {
          id: "ar_challenge_2",
          businessId: "business_2",
          name: "Strength Training Academy",
          description: "Train with virtual personal trainers in this high-intensity AR workout",
          challengeType: "fitness_challenge",
          difficulty: "hard",
          requiredSkillLevel: 3,
          experienceReward: 300,
          collectibleRewards: ["Strength Gem", "Endurance Crystal"],
          badgeReward: "Fitness Warrior",
          timeLimit: 45,
          maxParticipants: 15,
          currentParticipants: 8,
          isTeamChallenge: true,
          arModel: "training_ground.glb",
          interactionType: "movement",
          gameInstructions: {
            steps: [
              "Position yourself in the designated AR zone",
              "Follow the virtual trainer's movements",
              "Complete exercise sequences with proper form",
              "Achieve target heart rate for bonus points"
            ],
            scoringCriteria: ["Form Accuracy", "Completion Time", "Heart Rate Zone", "Team Coordination"]
          }
        }
      ];
      
      res.json({ challenges });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch AR challenges" });
    }
  });

  // Social AR Features
  app.post("/api/ar/social/meetup", async (req, res) => {
    try {
      const { fromUserId, toUserId, businessId, meetupType } = req.body;
      
      const meetup = {
        id: `meetup_${Date.now()}`,
        participants: [fromUserId, toUserId],
        businessId,
        meetupType, // avatar_hangout, skill_sharing, item_trade, team_challenge
        experienceBonus: 50,
        socialBonus: 25,
        activities: [
          "Avatar customization sharing",
          "Collaborative AR mini-games",
          "Skill demonstration",
          "Item trading session"
        ],
        createdAt: new Date()
      };
      
      res.json({ success: true, meetup });
    } catch (error) {
      res.status(500).json({ error: "Failed to create AR meetup" });
    }
  });

  // Business AR Transformations
  app.get("/api/ar/business/transformations", async (req, res) => {
    try {
      const transformations = [
        {
          id: "transform_1",
          businessId: "coffee_shop_1",
          businessName: "Joe's Coffee Shop",
          transformationType: "Enchanted Café",
          description: "Magical brewing station with potion-making mini-games",
          arModels: ["magic_cauldron.glb", "floating_ingredients.glb", "spell_effects.glb"],
          interactiveElements: [
            {
              name: "Brewing Station",
              description: "Mix magical ingredients to create special drinks",
              skillBoosts: { cooking: 20, social: 10 }
            },
            {
              name: "Ingredient Garden",
              description: "Harvest virtual herbs and spices",
              collectibleSpawns: ["Magic Beans", "Golden Spoon", "Aroma Crystal"]
            }
          ],
          socialFeatures: {
            meetupSpots: ["Cozy Corner Table", "Community Brewing Area"],
            groupActivities: ["Latte Art Competition", "Flavor Tasting Challenge"]
          }
        },
        {
          id: "transform_2",
          businessId: "gym_1",
          businessName: "FitZone Gym",
          transformationType: "Warrior Training Ground",
          description: "Epic fitness challenges with mythical creature battles",
          arModels: ["battle_arena.glb", "warrior_equipment.glb", "mythical_creatures.glb"],
          interactiveElements: [
            {
              name: "Battle Arena",
              description: "Fight virtual creatures while working out",
              skillBoosts: { fitness: 25, social: 15 }
            },
            {
              name: "Weapon Forge",
              description: "Craft virtual weapons through strength exercises",
              collectibleSpawns: ["Strength Gem", "Endurance Stone", "Victory Medal"]
            }
          ],
          socialFeatures: {
            meetupSpots: ["Team Formation Circle", "Victory Celebration Platform"],
            groupActivities: ["Guild Battles", "Cooperative Raids", "Leaderboard Challenges"]
          }
        }
      ];
      
      res.json({ transformations });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch business transformations" });
    }
  });

  // Team Battle System
  app.post("/api/ar/team/battle/join", async (req, res) => {
    try {
      const { userId, teamId, battleType } = req.body;
      
      const battle = {
        id: `battle_${Date.now()}`,
        battleType, // territory_conquest, skill_showdown, treasure_race
        teams: {
          team_a: { id: "team_alpha", members: [], score: 0, name: "Coffee Crusaders" },
          team_b: { id: "team_beta", members: [], score: 0, name: "Fitness Warriors" }
        },
        objectives: [
          "Capture 5 business locations",
          "Complete 10 AR challenges",
          "Collect 20 rare items",
          "Achieve 1000 team experience points"
        ],
        rewards: {
          winning_team: ["Team Victory Crown", "Champion Badge", "500 XP Bonus"],
          all_participants: ["Battle Participation Badge", "100 XP", "Random Collectible"]
        },
        duration: 120, // minutes
        status: "active"
      };
      
      res.json({ success: true, battle });
    } catch (error) {
      res.status(500).json({ error: "Failed to join team battle" });
    }
  });

  // Daily Challenges & Streaks
  app.get("/api/ar/daily-challenges/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      
      const dailyChallenges = {
        today: {
          date: new Date().toISOString().split('T')[0],
          challenges: [
            {
              id: "daily_1",
              title: "Social Butterfly",
              description: "Meet 3 friends' avatars at different businesses",
              progress: 1,
              target: 3,
              reward: "Social Interaction Bonus (+50 XP)",
              completed: false
            },
            {
              id: "daily_2", 
              title: "Skill Builder",
              description: "Gain 100 XP in any skill through AR activities",
              progress: 75,
              target: 100,
              reward: "Skill Boost Item",
              completed: false
            },
            {
              id: "daily_3",
              title: "Explorer's Quest",
              description: "Visit 2 new businesses you haven't been to before",
              progress: 2,
              target: 2,
              reward: "Explorer Badge",
              completed: true
            }
          ]
        },
        streak: {
          current: 7,
          longest: 12,
          bonus: 35, // percentage XP bonus
          nextMilestone: {
            days: 10,
            reward: "Rare Item Guaranteed + Streak Master Badge"
          }
        }
      };
      
      res.json({ dailyChallenges });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch daily challenges" });
    }
  });
}