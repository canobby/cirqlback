import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../auth";
import type { RouteDeps } from "./_shared";

// ── Collections / passports ─────────────────────────────────────────────────
// Curated sets of businesses ("visit all N → complete the passport → bonus
// points"). Admin (any businesses) or coordinator (territory businesses) create
// them; customers see their progress; advancement happens in the tap loop.
export function registerCollectionRoutes(app: Express, _deps: RouteDeps) {
  app.post("/api/collections", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id as string;
      const [isAdmin, coordinator] = await Promise.all([
        storage.isPlatformAdmin(userId),
        storage.getCoordinatorByUserId(userId),
      ]);
      const asCoordinator = !isAdmin && coordinator && coordinator.isActive !== false;
      if (!isAdmin && !asCoordinator) return res.status(403).json({ error: "Only admins or coordinators can create collections" });

      const name = String(req.body?.name ?? "").trim().slice(0, 80);
      const rewardPoints = Number(req.body?.rewardPoints);
      const ids: string[] = Array.isArray(req.body?.businessIds) ? req.body.businessIds : [];
      if (!name) return res.status(400).json({ error: "A name is required" });
      if (!Number.isInteger(rewardPoints) || rewardPoints < 0) return res.status(400).json({ error: "rewardPoints must be a whole number" });
      if (ids.length < 2) return res.status(400).json({ error: "Add at least 2 businesses" });

      // Coordinators may only include businesses in their territory.
      const allowed: string[] = [];
      for (const bid of ids) {
        if (isAdmin) { if (await storage.getBusiness(bid)) allowed.push(bid); }
        else if (await storage.coordinatorOwnsBusiness((coordinator as any).id, bid)) allowed.push(bid);
      }
      if (allowed.length < 2) return res.status(400).json({ error: "At least 2 eligible businesses are required" });

      const collection = await storage.createCollection({
        name,
        description: typeof req.body?.description === "string" ? req.body.description.slice(0, 300) : null,
        emoji: typeof req.body?.emoji === "string" ? req.body.emoji.slice(0, 8) : null,
        color: typeof req.body?.color === "string" ? req.body.color.slice(0, 9) : null,
        rewardPoints,
        createdByUserId: userId,
        createdByRole: isAdmin ? "admin" : "coordinator",
        territoryId: null,
      });
      for (const bid of allowed) await storage.addCollectionItem(collection.id, bid);
      res.status(201).json({ id: collection.id, added: allowed.length });
    } catch (error) {
      console.error("Create collection error:", error);
      res.status(500).json({ error: "Failed to create collection" });
    }
  });

  // A customer's passport progress across active collections.
  app.get("/api/collections/mine", isAuthenticated, async (req, res) => {
    try {
      const email = (req.user as any).email ?? null;
      const userId = (req.user as any).id as string;
      res.json(await storage.getCollectionsProgressForCustomer(email, userId));
    } catch (error) {
      console.error("My collections error:", error);
      res.status(500).json({ error: "Failed to load passports" });
    }
  });

  // Admin/coordinator: list all collections.
  app.get("/api/admin/collections", async (_req, res) => {
    try {
      res.json(await storage.getAllCollections());
    } catch (error) {
      console.error("List collections error:", error);
      res.status(500).json({ error: "Failed to load collections" });
    }
  });
}
