import type { Express } from "express";
import { storage } from "../storage";
import type { RouteDeps } from "./_shared";

// CHR-51: Community Coordinator API. Every route here is gated by
// `isCoordinator` in the composition root, so req.coordinator is always set.
export function registerCoordinatorRoutes(app: Express, _deps: RouteDeps) {
  // The signed-in coordinator's profile + the territories they manage.
  app.get("/api/coordinator/me", async (req, res) => {
    try {
      const coordinator = (req as any).coordinator;
      const territories = await storage.getTerritoriesByCoordinator(coordinator.id);
      res.json({ coordinator, territories });
    } catch (error) {
      console.error("Coordinator profile error:", error);
      res.status(500).json({ error: "Failed to load coordinator profile" });
    }
  });

  // CHR-52: real territory overview — totals + per-store engagement, scoped to
  // the coordinator's own territories.
  app.get("/api/coordinator/territory/overview", async (req, res) => {
    try {
      const coordinator = (req as any).coordinator;
      const overview = await storage.getTerritoryOverview(coordinator.id);
      res.json(overview);
    } catch (error) {
      console.error("Territory overview error:", error);
      res.status(500).json({ error: "Failed to load territory overview" });
    }
  });
}
