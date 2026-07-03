import type { Express } from "express";
import { getLegalDoc, isLegalSlug } from "../legal-docs";
import type { RouteDeps } from "./_shared";

// Public legal/compliance content — the in-app Terms/Privacy/FAQ pages fetch
// these so the website and the downloadable docs/legal/ files never drift.
export function registerLegalRoutes(app: Express, _deps: RouteDeps) {
  app.get("/api/legal/:slug", (req, res) => {
    const slug = String(req.params.slug || "");
    if (!isLegalSlug(slug)) return res.status(404).json({ error: "Unknown document" });
    const markdown = getLegalDoc(slug);
    if (markdown == null) return res.status(404).json({ error: "Unknown document" });
    res.json({ slug, markdown });
  });
}
