// Grounding knowledge for the in-dashboard Help Assistant.
//
// The assistant is a "how-to" guide, so its single source of truth is the same
// Markdown manuals we ship in docs/manuals/. We read the relevant guide(s) for
// the asking user's role at server start and cache them in memory. Keeping the
// manuals as the source means the bot never drifts from the published docs.
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

export type AssistantRole = "business" | "coordinator" | "admin";

// Which manuals ground each role. Business covers both Core and Pro (the Pro
// guide is a superset of Core); coordinators also get the sales playbook.
const ROLE_MANUALS: Record<AssistantRole, string[]> = {
  business: ["business-basic-guide.md", "business-pro-guide.md"],
  coordinator: ["coordinator-guide.md", "coordinator-sales-playbook.md"],
  admin: ["admin-guide.md"],
};

// Resolve docs/manuals both in dev (tsx from server/) and in the esbuild bundle
// (dist/index.js) — the repo root is one level up from either, and we fall back
// to the process CWD (Render runs `npm start` from the repo root).
function manualsDir(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    resolve(here, "..", "docs", "manuals"),
    resolve(process.cwd(), "docs", "manuals"),
  ];
  return candidates.find((d) => existsSync(d)) || candidates[0];
}

// Strip screenshot lines and collapse blank runs to keep the grounding compact
// (images carry no text value for the model and just spend tokens).
function trimManual(md: string): string {
  return md
    .replace(/^!\[[^\]]*\]\([^)]*\)\s*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const cache = new Map<AssistantRole, string>();

export function getKnowledgeForRole(role: AssistantRole): string {
  const cached = cache.get(role);
  if (cached !== undefined) return cached;

  const dir = manualsDir();
  const parts: string[] = [];
  for (const file of ROLE_MANUALS[role]) {
    const p = resolve(dir, file);
    try {
      if (existsSync(p)) parts.push(trimManual(readFileSync(p, "utf8")));
    } catch (err) {
      console.error(`assistant-knowledge: failed to read ${file}:`, err);
    }
  }
  const knowledge = parts.join("\n\n---\n\n");
  cache.set(role, knowledge);
  return knowledge;
}

export function isAssistantRole(v: unknown): v is AssistantRole {
  return v === "business" || v === "coordinator" || v === "admin";
}
