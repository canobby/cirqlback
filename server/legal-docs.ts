// Serve the legal/compliance Markdown in docs/legal/ to the website so the
// in-app pages and the downloadable files stay a single source of truth. Same
// runtime-read pattern as assistant-knowledge.ts.
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

// Whitelist: slug -> filename. Only these can be fetched.
const DOCS: Record<string, string> = {
  terms: "terms-of-service.md",
  privacy: "privacy-policy.md",
  merchant: "merchant-agreement.md",
  coordinator: "coordinator-independent-contractor-agreement.md",
  "coordinator-1099": "coordinator-1099-guide.md",
  safeguards: "insurance-and-security-safeguards.md",
  faq: "faq.md",
};

function legalDir(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    resolve(here, "..", "docs", "legal"),
    resolve(process.cwd(), "docs", "legal"),
  ];
  return candidates.find((d) => existsSync(d)) || candidates[0];
}

const cache = new Map<string, string>();

export function isLegalSlug(slug: string): boolean {
  return Object.prototype.hasOwnProperty.call(DOCS, slug);
}

export function getLegalDoc(slug: string): string | null {
  if (!isLegalSlug(slug)) return null;
  const cached = cache.get(slug);
  if (cached !== undefined) return cached;
  const p = resolve(legalDir(), DOCS[slug]);
  try {
    const md = existsSync(p) ? readFileSync(p, "utf8") : "";
    cache.set(slug, md);
    return md;
  } catch (err) {
    console.error(`legal-docs: failed to read ${slug}:`, err);
    return "";
  }
}

export const legalSlugs = Object.keys(DOCS);
