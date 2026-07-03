import type { Express } from "express";
import { z } from "zod";
import { isAuthenticated } from "../auth";
import { openaiService, type AssistantTurn } from "../openai-service";
import { isAssistantRole } from "../assistant-knowledge";
import type { RouteDeps } from "./_shared";

// In-dashboard Help Assistant — a "how-to" guide grounded in the shipped
// manuals. Available to authenticated business, coordinator, and admin users.
export function registerAssistantRoutes(app: Express, _deps: RouteDeps) {
  const bodySchema = z.object({
    role: z.enum(["business", "coordinator", "admin"]),
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
    const { role, messages } = parsed.data;
    if (!isAssistantRole(role)) return res.status(400).json({ error: "Unknown role" });

    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({
        error: "The Help Assistant isn't configured on this server yet. Please check the manuals or contact support.",
      });
    }

    try {
      const reply = await openaiService.answerHelpQuestion(role, messages as AssistantTurn[]);
      res.json({ reply });
    } catch (err) {
      console.error("assistant chat error:", err);
      res.status(500).json({ error: "The assistant had trouble responding. Please try again." });
    }
  });
}
