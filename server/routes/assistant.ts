import type { Express } from "express";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { adminUsers, type User } from "@shared/schema";
import { storage } from "../storage";
import { isAuthenticated } from "../auth";
import { openaiService, type AssistantTurn } from "../openai-service";
import { isAssistantRole, type AssistantRole } from "../assistant-knowledge";
import type { RouteDeps } from "./_shared";

// Decide whether the authenticated user is actually entitled to the guide they
// asked for, using authoritative signals (admin/coordinator tables + business
// ownership) — NOT the client-supplied role or the mutable users.role string.
// Returns the plan tier for the business role so grounding can be scoped.
async function authorizeRole(
  user: User,
  role: AssistantRole,
): Promise<{ allowed: boolean; tier?: string }> {
  const userId = user.id;
  if (role === "admin") {
    const [admin] = await db.select().from(adminUsers).where(eq(adminUsers.userId, userId));
    return { allowed: !!admin && admin.isActive !== false };
  }
  if (role === "coordinator") {
    const coordinator = await storage.getCoordinatorByUserId(userId);
    return { allowed: !!coordinator && coordinator.isActive !== false };
  }
  // business: must actually own a business (customers own none).
  const owned = await storage.getBusinessesByOwner(userId);
  return { allowed: owned.length > 0, tier: (user as any).subscriptionTier || "starter" };
}

// In-dashboard Help Assistant — a "how-to" guide grounded in the shipped
// manuals. Available to authenticated business, coordinator, and admin users,
// each scoped to their own guide.
export function registerAssistantRoutes(app: Express, _deps: RouteDeps) {
  const bodySchema = z.object({
    role: z.enum(["business", "coordinator", "admin"]),
    stream: z.boolean().optional(),
    messages: z
      .array(
        z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string().min(1).max(4000),
        }),
      )
      .min(1)
      .max(20),
  });

  app.post("/api/assistant/chat", isAuthenticated, async (req, res) => {
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    }
    const { role, messages, stream } = parsed.data;
    if (!isAssistantRole(role)) return res.status(400).json({ error: "Unknown role" });

    // Server-side authorization: a customer (or a business user) cannot pull the
    // admin/coordinator guide just by asking for it in the request body.
    const { allowed, tier } = await authorizeRole(req.user as User, role);
    if (!allowed) {
      return res.status(403).json({ error: "This guide isn't available for your account." });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({
        error: "The Help Assistant isn't configured on this server yet. Please check the manuals or contact support.",
      });
    }

    // Streaming path (Server-Sent Events): the widget renders deltas as they land.
    if (stream) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders?.();
      try {
        for await (const delta of openaiService.streamHelpAnswer(role, messages as AssistantTurn[], tier)) {
          res.write(`data: ${JSON.stringify({ delta })}\n\n`);
        }
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      } catch (err) {
        console.error("assistant stream error:", err);
        res.write(`data: ${JSON.stringify({ error: "The assistant had trouble responding. Please try again." })}\n\n`);
      }
      return res.end();
    }

    try {
      const reply = await openaiService.answerHelpQuestion(role, messages as AssistantTurn[], tier);
      res.json({ reply });
    } catch (err) {
      console.error("assistant chat error:", err);
      res.status(500).json({ error: "The assistant had trouble responding. Please try again." });
    }
  });
}
