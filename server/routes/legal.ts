import type { Express } from "express";
import { getLegalDoc, getLegalPdfPath, isLegalSlug } from "../legal-docs";
import type { RouteDeps } from "./_shared";

// Public legal/compliance content — the in-app Terms/Privacy/FAQ pages fetch
// these so the website and the downloadable docs/legal/ files never drift.
export function registerLegalRoutes(app: Express, _deps: RouteDeps) {
  // Downloadable branded PDF for a public doc (declared before /:slug is fine —
  // the paths differ by segment count).
  app.get("/api/legal/:slug/pdf", (req, res) => {
    const slug = String(req.params.slug || "");
    if (!isLegalSlug(slug)) return res.status(404).json({ error: "Unknown document" });
    const path = getLegalPdfPath(slug);
    if (!path) return res.status(404).json({ error: "PDF not available" });
    res.download(path, `Cirqlback-${slug}.pdf`);
  });

  app.get("/api/legal/:slug", (req, res) => {
    const slug = String(req.params.slug || "");
    if (!isLegalSlug(slug)) return res.status(404).json({ error: "Unknown document" });
    const markdown = getLegalDoc(slug);
    if (markdown == null) return res.status(404).json({ error: "Unknown document" });
    res.json({ slug, markdown });
  });
}
