import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../auth";
import type { RouteDeps } from "./_shared";

// Daily spin-the-wheel + seasonal events (time-boxed tap point multipliers).
export function registerSpinEventRoutes(app: Express, _deps: RouteDeps) {
  // ── Daily spin ────────────────────────────────────────────────────────────
  app.get("/api/spin/status", isAuthenticated, async (req, res) => {
    try {
      res.json(await storage.getSpinStatus((req.user as any).id));
    } catch (error) {
      console.error("Spin status error:", error);
      res.status(500).json({ error: "Failed to load spin status" });
    }
  });

  app.post("/api/spin", isAuthenticated, async (req, res) => {
    try {
      const points = await storage.doDailySpin((req.user as any).id);
      if (points == null) return res.status(409).json({ error: "You've already spun today. Come back tomorrow!" });
      res.json({ points });
    } catch (error) {
      console.error("Spin error:", error);
      res.status(500).json({ error: "Failed to spin" });
    }
  });

  // ── Seasonal events ───────────────────────────────────────────────────────
  // Active events (public — powers the customer banner).
  app.get("/api/events/active", async (_req, res) => {
    try {
      res.json(await storage.getActiveEvents());
    } catch (error) {
      console.error("Active events error:", error);
      res.status(500).json({ error: "Failed to load events" });
    }
  });

  app.post("/api/admin/events", async (req, res) => {
    try {
      const name = String(req.body?.name ?? "").trim().slice(0, 80);
      const pointMultiplier = Number(req.body?.pointMultiplier);
      const startsAt = new Date(req.body?.startsAt);
      const endsAt = new Date(req.body?.endsAt);
      if (!name) return res.status(400).json({ error: "A name is required" });
      if (!Number.isInteger(pointMultiplier) || pointMultiplier < 1 || pointMultiplier > 10) return res.status(400).json({ error: "Multiplier must be 1–10" });
      if (isNaN(startsAt.getTime()) || isNaN(endsAt.getTime()) || endsAt <= startsAt) return res.status(400).json({ error: "Provide a valid start and end (end after start)" });
      const event = await storage.createEvent({
        name,
        description: typeof req.body?.description === "string" ? req.body.description.slice(0, 300) : null,
        emoji: typeof req.body?.emoji === "string" ? req.body.emoji.slice(0, 8) : null,
        pointMultiplier, startsAt, endsAt,
        createdByUserId: (req.user as any).id,
      });
      res.status(201).json(event);
    } catch (error) {
      console.error("Create event error:", error);
      res.status(500).json({ error: "Failed to create event" });
    }
  });

  app.get("/api/admin/events", async (_req, res) => {
    try {
      res.json(await storage.getAllEvents());
    } catch (error) {
      console.error("List events error:", error);
      res.status(500).json({ error: "Failed to load events" });
    }
  });
}
