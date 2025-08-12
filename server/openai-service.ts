import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY environment variable must be set");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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

export class OpenAIService {
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
}

export const openaiService = new OpenAIService();