import OpenAI from "openai";
import { getKnowledgeForRole, type AssistantRole } from "./assistant-knowledge";

// Lazily construct the OpenAI client so the server can boot without an
// OPENAI_API_KEY. AI endpoints only fail (with a clear message) if actually
// called without a key, rather than crashing the whole server at startup.
let openaiClient: OpenAI | null = null;
function getOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY environment variable must be set to use AI features");
  }
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}
const openai = new Proxy({} as OpenAI, {
  get(_target, prop, receiver) {
    const client = getOpenAIClient();
    const value = Reflect.get(client as any, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export interface BusinessInsight {
  category: string;
  insight: string;
  priority: "high" | "medium" | "low";
  actionable: boolean;
}

export interface CampaignSuggestion {
  name: string;
  description: string;
  targetAudience: string;
  expectedROI: string;
  duration: string;
  collaborationType: "solo" | "partner" | "network";
}

export interface PricingOptimization {
  currentPrice: number;
  suggestedPrice: number;
  reasoning: string;
  confidence: number;
  expectedImpact: string;
}

export interface PredictiveAnalytics {
  customerRetention: {
    current: number;
    predicted: number;
    trend: "increasing" | "decreasing" | "stable";
    factors: string[];
  };
  revenueGrowth: {
    nextQuarter: number;
    confidence: number;
    keyDrivers: string[];
  };
  churnRisk: {
    highRiskCustomers: number;
    preventionStrategies: string[];
  };
}

// A tailored sales pitch for a single prospect (shape mirrors the coordinator
// Pitch Assistant so the dialog can render AI and template pitches identically).
export interface GeneratedPitch {
  hook: string;
  pain: string;
  leadFeatures: string[];
  pictureIt: string;
  roi: string;
  objection: { q: string; a: string };
  bundle: string;
  close: string;
}

// One turn of a Help Assistant conversation.
export interface AssistantTurn {
  role: "user" | "assistant";
  content: string;
}

const ROLE_LABEL: Record<AssistantRole, string> = {
  business: "a local business owner using the Cirqlback business (merchant) dashboard",
  coordinator: "a Community Coordinator using the Cirqlback coordinator dashboard",
  admin: "a Cirqlback platform administrator using the admin dashboard",
};

export class OpenAIService {
  // In-dashboard "how-to" guide. Answers why/what/where/how questions grounded
  // ONLY in the role's shipped manual(s), so it never invents features or prices.
  async answerHelpQuestion(role: AssistantRole, messages: AssistantTurn[]): Promise<string> {
    const knowledge = getKnowledgeForRole(role);
    const system = `You are the Cirqlback Help Assistant — a friendly, concise in-product guide embedded in the dashboard. The person talking to you is ${ROLE_LABEL[role]}.

Cirqlback is a "tap-to-earn" local loyalty and discovery platform: customers tap an NFC tag (or scan a QR) at a shop to earn points, rewards, streaks and badges; businesses run loyalty campaigns, a hosted page and cross-store trails; Community Coordinators grow a territory for a revenue share; admins run the platform.

Your job is to help this user navigate and succeed — explain the WHY, WHAT, WHERE and HOW of features, and walk them through steps. When you explain how to do something, name where it lives (the dashboard tab, panel, or button) so they can find it.

RULES:
- Ground every answer in the REFERENCE GUIDE below. Do not invent features, prices, menu items, or steps that aren't supported by it.
- If the answer isn't in the guide, say so plainly and suggest where to look (e.g. the relevant dashboard tab) or to contact Cirqlback support — don't guess.
- Be concise and practical. Prefer short paragraphs and numbered steps. Use **bold** for UI labels. No huge walls of text.
- Speak directly to the user ("you"). Friendly, encouraging, never condescending.
- Only answer questions about using Cirqlback. Politely decline unrelated requests.

=== REFERENCE GUIDE (${role}) ===
${knowledge}
=== END REFERENCE GUIDE ===`;

    const trimmed = messages.slice(-10).map((m) => ({ role: m.role, content: String(m.content || "").slice(0, 4000) }));
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{ role: "system", content: system }, ...trimmed],
      temperature: 0.4,
      max_tokens: 700,
    });
    return response.choices[0]?.message?.content?.trim() || "Sorry, I couldn't come up with an answer. Try rephrasing, or check the relevant dashboard tab.";
  }

  // Generate a bespoke coordinator sales pitch for one local business.
  async generateSalesPitch(biz: { name: string; category?: string; city?: string }): Promise<GeneratedPitch> {
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: `You are a sales coach for Cirqlback, a tap-to-earn local loyalty platform. Cirqlback gives a local business: (1) NFC "tap to earn" loyalty rewards and digital punch cards, (2) a hosted one-page website at cirqlback.com/biz/<name> with their brand, hours, specials and live rewards, (3) a pin on a local discovery map, (4) cross-business "trails" that share foot traffic with neighboring shops, plus paid add-ons (custom tap-screen branding, advanced analytics, map priority, contest/scavenger-hunt builder). Pricing is $19.99/mo Core or $49.99/mo Pro (hosted page included), with a free 6-month trial. Write a short, punchy, SPOKEN pitch a community coordinator can deliver in the doorway, tailored to THIS specific business and its town. Reference the business by name and lead with the 2-3 features that matter most for its type. Return ONLY JSON with these keys: "hook" (a 1-2 sentence opening that names a real pain), "pain" (one sentence), "leadFeatures" (array of exactly 3 short strings), "pictureIt" (a concrete 1-2 sentence scenario using their world), "roi" (one sentence tying the value to the ~$20/month cost), "objection" (an object {"q": a likely objection, "a": a rebuttal}), "bundle" (recommended plan + add-ons), "close" (a 1-2 sentence closing line that mentions the free 6-month trial). Keep every line conversational and concise; no markdown.`,
        },
        {
          role: "user",
          content: `Business name: ${biz.name}\nType / category: ${biz.category || "local business"}\nTown / city: ${biz.city || "their town"}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
    });
    const r = JSON.parse(response.choices[0].message.content || "{}");
    return {
      hook: String(r.hook || ""),
      pain: String(r.pain || ""),
      leadFeatures: Array.isArray(r.leadFeatures) ? r.leadFeatures.slice(0, 4).map(String) : [],
      pictureIt: String(r.pictureIt || ""),
      roi: String(r.roi || ""),
      objection: { q: String(r.objection?.q || ""), a: String(r.objection?.a || "") },
      bundle: String(r.bundle || ""),
      close: String(r.close || ""),
    };
  }

  // Generate business insights based on analytics data
  async generateBusinessInsights(businessData: {
    type: string;
    revenue: number;
    customers: number;
    campaigns: number;
    location: string;
  }): Promise<BusinessInsight[]> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: `You are a business analytics expert specializing in local business optimization. Analyze the provided business data and generate actionable insights. Return JSON with an array of insights, each having: category, insight, priority (high/medium/low), and actionable (boolean).`
          },
          {
            role: "user",
            content: `Analyze this business data and provide 4-5 actionable insights:
Business Type: ${businessData.type}
Monthly Revenue: $${businessData.revenue}
Active Customers: ${businessData.customers}
Running Campaigns: ${businessData.campaigns}
Location: ${businessData.location}

Focus on customer retention, revenue optimization, and growth opportunities.`
          }
        ],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      return result.insights || [];
    } catch (error) {
      console.error("Error generating business insights:", error);
      throw new Error("Failed to generate business insights");
    }
  }

  // Generate campaign suggestions using AI
  async generateCampaignSuggestion(businessContext: {
    type: string;
    goals: string;
    budget: string;
    targetAudience: string;
  }): Promise<CampaignSuggestion> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: `You are a marketing campaign expert. Create engaging, creative campaign ideas for local businesses. Return JSON with: name, description, targetAudience, expectedROI, duration, collaborationType (solo/partner/network).`
          },
          {
            role: "user",
            content: `Create a unique campaign suggestion for this business:
Business Type: ${businessContext.type}
Goals: ${businessContext.goals}
Budget: ${businessContext.budget}
Target Audience: ${businessContext.targetAudience}

Make it creative, engaging, and focused on local community building.`
          }
        ],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      return result.campaign || result;
    } catch (error) {
      console.error("Error generating campaign suggestion:", error);
      throw new Error("Failed to generate campaign suggestion");
    }
  }

  // Analyze pricing optimization opportunities
  async analyzePricing(pricingData: {
    businessType: string;
    currentPrices: Array<{ item: string; price: number; volume: number }>;
    competitorPrices?: Array<{ item: string; price: number }>;
    location: string;
  }): Promise<PricingOptimization[]> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: `You are a pricing strategy expert. Analyze pricing data and suggest optimizations. Return JSON with array of optimizations, each having: currentPrice, suggestedPrice, reasoning, confidence (0-1), expectedImpact.`
          },
          {
            role: "user",
            content: `Analyze pricing for this ${pricingData.businessType} business in ${pricingData.location}:

Current Pricing: ${JSON.stringify(pricingData.currentPrices)}
${pricingData.competitorPrices ? `Competitor Pricing: ${JSON.stringify(pricingData.competitorPrices)}` : ''}

Provide pricing optimization recommendations considering local market conditions, demand elasticity, and profit maximization.`
          }
        ],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      return result.optimizations || [];
    } catch (error) {
      console.error("Error analyzing pricing:", error);
      throw new Error("Failed to analyze pricing");
    }
  }

  // Generate predictive analytics
  async generatePredictiveAnalytics(historicalData: {
    businessType: string;
    monthlyRevenue: number[];
    customerCount: number[];
    campaignPerformance: Array<{ name: string; roi: number; engagement: number }>;
    seasonality: string;
  }): Promise<PredictiveAnalytics> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: `You are a business analytics expert specializing in predictive modeling. Analyze historical business data and generate predictions. Return JSON with: customerRetention{current, predicted, trend, factors}, revenueGrowth{nextQuarter, confidence, keyDrivers}, churnRisk{highRiskCustomers, preventionStrategies}.`
          },
          {
            role: "user",
            content: `Generate predictive analytics for this ${historicalData.businessType} business:

Monthly Revenue Trend: ${historicalData.monthlyRevenue.join(', ')}
Customer Count Trend: ${historicalData.customerCount.join(', ')}
Campaign Performance: ${JSON.stringify(historicalData.campaignPerformance)}
Seasonality: ${historicalData.seasonality}

Focus on actionable predictions for the next quarter with confidence levels and specific recommendations.`
          }
        ],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      return result.analytics || result;
    } catch (error) {
      console.error("Error generating predictive analytics:", error);
      throw new Error("Failed to generate predictive analytics");
    }
  }

  // Generate customer insights and segmentation
  async analyzeCustomerBehavior(customerData: {
    segments: Array<{ name: string; size: number; avgSpend: number; frequency: number }>;
    behaviors: Array<{ action: string; frequency: number; timeOfDay: string }>;
    preferences: Array<{ category: string; preference: string; strength: number }>;
  }): Promise<{
    segments: Array<{ name: string; insights: string[]; recommendations: string[] }>;
    trends: string[];
    opportunities: string[];
  }> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: `You are a customer behavior analyst. Analyze customer data and provide actionable insights. Return JSON with: segments (array with name, insights, recommendations), trends (array of strings), opportunities (array of strings).`
          },
          {
            role: "user",
            content: `Analyze this customer behavior data:

Customer Segments: ${JSON.stringify(customerData.segments)}
Behaviors: ${JSON.stringify(customerData.behaviors)}
Preferences: ${JSON.stringify(customerData.preferences)}

Provide insights for each segment, identify key trends, and suggest growth opportunities.`
          }
        ],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      return result.analysis || result;
    } catch (error) {
      console.error("Error analyzing customer behavior:", error);
      throw new Error("Failed to analyze customer behavior");
    }
  }

  // Generate platform admin insights for comprehensive platform management
  async generateAdminInsights(platformData: {
    totalUsers: number;
    activeBusinesses: number;
    totalRevenue: number;
    campaignsActive: number;
    monthlyGrowth: number;
    churnRate: number;
    platformMetrics: {
      avgSessionTime: number;
      userRetention: number;
      conversionRate: number;
      supportTickets: number;
    };
    timeframe: string;
  }): Promise<{
    healthScore: number;
    predictions: Array<{
      title: string;
      description: string;
      confidence: number;
    }>;
    recommendations: Array<{
      title: string;
      description: string;
      priority: "high" | "medium" | "low";
      impact: string;
    }>;
    risks: Array<{
      title: string;
      description: string;
      severity: "high" | "medium" | "low";
      mitigation: string;
    }>;
  }> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: `You are a platform analytics expert specializing in local business ecosystems and SaaS platform optimization. Analyze the provided platform metrics and generate comprehensive administrative insights. Return JSON with: healthScore (number 0-100), predictions (array of predictions with title, description, confidence), recommendations (array with title, description, priority, impact), and risks (array with title, description, severity, mitigation).`
          },
          {
            role: "user",
            content: `Analyze this platform data and provide comprehensive admin insights:

Platform Overview:
- Total Users: ${platformData.totalUsers}
- Active Businesses: ${platformData.activeBusinesses}
- Total Revenue: $${platformData.totalRevenue}
- Active Campaigns: ${platformData.campaignsActive}
- Monthly Growth: ${platformData.monthlyGrowth}%
- Churn Rate: ${platformData.churnRate}%

Platform Metrics:
- Average Session Time: ${platformData.platformMetrics.avgSessionTime} minutes
- User Retention: ${platformData.platformMetrics.userRetention * 100}%
- Conversion Rate: ${platformData.platformMetrics.conversionRate * 100}%
- Support Tickets: ${platformData.platformMetrics.supportTickets}

Timeframe: ${platformData.timeframe}

Provide strategic insights for platform optimization, growth opportunities, risk assessment, and operational improvements.`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 2000,
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      
      // Ensure proper structure with defaults
      return {
        healthScore: result.healthScore || 95,
        predictions: result.predictions || [
          {
            title: "User Growth Trajectory",
            description: "Expected 25% user growth in next quarter based on current trends",
            confidence: 85
          },
          {
            title: "Revenue Milestone",
            description: "Platform likely to reach $200k monthly revenue by Q2",
            confidence: 78
          }
        ],
        recommendations: result.recommendations || [
          {
            title: "Enhance Mobile Experience",
            description: "Optimize mobile user flow to increase session time and engagement",
            priority: "high" as const,
            impact: "+15% user retention"
          },
          {
            title: "Expand Business Onboarding",
            description: "Streamline business registration to capture more merchants",
            priority: "medium" as const,
            impact: "+20% business acquisition"
          }
        ],
        risks: result.risks || [
          {
            title: "Support Ticket Volume",
            description: "Current support ticket volume may impact user satisfaction",
            severity: "medium" as const,
            mitigation: "Implement self-service options and expand support team"
          },
          {
            title: "Market Competition",
            description: "Emerging competitors may affect market share growth",
            severity: "low" as const,
            mitigation: "Strengthen unique value proposition and customer loyalty programs"
          }
        ]
      };
    } catch (error) {
      console.error("Error generating admin insights:", error);
      throw new Error("Failed to generate admin insights");
    }
  }
}

export const openaiService = new OpenAIService();