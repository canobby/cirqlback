// Shared model + preset catalogs for the Hosted Business Page add-on.
//
// The whole point is customization WITHOUT a website builder: a fixed,
// always-responsive template driven by a bounded set of high-leverage knobs
// (accent color, font pairing, hero style, which sections show and in what
// order). Two businesses filling these in differently produce pages that look
// nothing alike, yet no combination can ever break the layout.
//
// All of this is persisted on businesses.website_content (jsonb) — no schema
// migration. Both the server (public page renderer + PUT validation) and the
// client (editor + preview) import from here so they agree on the shape.

// ── Bounded customization axes ──

export const FONT_PRESETS = {
  modern: {
    label: "Modern",
    heading: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`,
    body: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`,
  },
  classic: {
    label: "Classic Serif",
    heading: `Georgia, "Times New Roman", Times, serif`,
    body: `Georgia, "Times New Roman", Times, serif`,
  },
  editorial: {
    label: "Editorial",
    heading: `"Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif`,
    body: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`,
  },
  rounded: {
    label: "Friendly",
    heading: `"Trebuchet MS", "Segoe UI", Verdana, sans-serif`,
    body: `"Trebuchet MS", "Segoe UI", Verdana, sans-serif`,
  },
} as const;

export type FontPreset = keyof typeof FONT_PRESETS;

export const HERO_STYLES = {
  photo: { label: "Full-bleed photo" },
  overlay: { label: "Photo with overlay card" },
  gradient: { label: "Color gradient" },
  split: { label: "Split image / text" },
} as const;

export type HeroStyle = keyof typeof HERO_STYLES;

// A fixed catalog of sections. The business toggles which appear and drags to
// reorder — that gives the *feel* of layout control without a builder.
export const SECTION_CATALOG = {
  about: { label: "About" },
  specials: { label: "Specials & Offers" },
  rewards: { label: "Live Cirql Rewards" },
  hours: { label: "Hours" },
  gallery: { label: "Photo Gallery" },
  contact: { label: "Contact" },
  social: { label: "Social Links" },
} as const;

export type SectionKey = keyof typeof SECTION_CATALOG;

export const ALL_SECTIONS = Object.keys(SECTION_CATALOG) as SectionKey[];

// Suggested on-brand swatches for the editor; a business can also pick any hex.
export const ACCENT_SWATCHES = [
  "#7c3aed", "#2563eb", "#0d9488", "#db2777",
  "#ea580c", "#16a34a", "#dc2626", "#4f46e5",
];

export const DEFAULT_ACCENT = "#7c3aed";

// ── Content model ──

export interface WebsiteDayHours {
  open: string;
  close: string;
  closed: boolean;
}

export type WebsiteHours = Record<string, WebsiteDayHours>;

export interface WebsiteSocialLinks {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  website?: string;
}

export interface BusinessWebsiteContent {
  businessName: string;
  tagline: string;
  about: string;
  specials: string;
  accentColor: string;   // validated #rrggbb
  fontPreset: FontPreset;
  heroStyle: HeroStyle;
  heroImage: string;     // url; empty falls back to a gradient hero
  sections: SectionKey[]; // ordered subset of ALL_SECTIONS
  contact: { phone: string; email: string; address: string };
  social: WebsiteSocialLinks;
  hours: WebsiteHours;
  gallery: string[];
}

export const DAYS = [
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
] as const;

export function emptyHours(): WebsiteHours {
  const h: WebsiteHours = {};
  for (const d of DAYS) h[d] = { open: "09:00", close: "17:00", closed: false };
  return h;
}

// A sensible starting point, seeded from whatever business profile we have.
export function defaultWebsiteContent(seed?: Partial<{
  businessName: string; description: string; phone: string; email: string; address: string;
}>): BusinessWebsiteContent {
  return {
    businessName: seed?.businessName || "",
    tagline: "",
    about: seed?.description || "",
    specials: "",
    accentColor: DEFAULT_ACCENT,
    fontPreset: "modern",
    heroStyle: "gradient",
    heroImage: "",
    sections: ["about", "specials", "rewards", "hours", "contact"],
    contact: { phone: seed?.phone || "", email: seed?.email || "", address: seed?.address || "" },
    social: {},
    hours: emptyHours(),
    gallery: [],
  };
}

// ── Validation / sanitization ──
//
// PUT bodies are user-controlled and the content is rendered into a public HTML
// page, so every field is coerced to a known-safe shape here: enums whitelisted,
// strings trimmed + length-capped, the accent color forced to a strict hex, the
// section list filtered to known keys + de-duplicated, gallery/day maps bounded.
// (HTML-escaping of the string values happens at render time on the server.)

const LIMITS = {
  name: 120, tagline: 160, about: 2000, specials: 1000,
  contactField: 200, url: 500, gallery: 12,
};

function str(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  return v.trim().slice(0, max);
}

// Own-property membership — `key in obj` also matches inherited names like
// "__proto__"/"constructor"/"toString", which would let an invalid enum value
// slip past the whitelist. Use this for all catalog lookups.
function hasKey(obj: object, key: unknown): boolean {
  return typeof key === "string" && Object.prototype.hasOwnProperty.call(obj, key);
}

// Accept #rgb / #rrggbb (case-insensitive); otherwise fall back to default.
export function normalizeHex(v: unknown, fallback = DEFAULT_ACCENT): string {
  if (typeof v === "string") {
    const s = v.trim();
    if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(s)) return s.toLowerCase();
  }
  return fallback;
}

// Only allow http(s) URLs (or root-relative uploads); blocks javascript:, data:, etc.
function safeUrl(v: unknown): string {
  const s = str(v, LIMITS.url);
  if (!s) return "";
  if (s.startsWith("/")) return s;
  if (/^https?:\/\//i.test(s)) return s;
  return "";
}

function normalizeHours(v: unknown): WebsiteHours {
  const out = emptyHours();
  if (v && typeof v === "object") {
    for (const d of DAYS) {
      const row = (v as any)[d];
      if (row && typeof row === "object") {
        out[d] = {
          open: str(row.open, 10) || "09:00",
          close: str(row.close, 10) || "17:00",
          closed: Boolean(row.closed),
        };
      }
    }
  }
  return out;
}

function normalizeSections(v: unknown): SectionKey[] {
  const seen = new Set<SectionKey>();
  const out: SectionKey[] = [];
  if (Array.isArray(v)) {
    for (const k of v) {
      if (hasKey(SECTION_CATALOG, k) && !seen.has(k as SectionKey)) {
        seen.add(k as SectionKey);
        out.push(k as SectionKey);
      }
    }
  }
  return out.length ? out : ["about", "specials", "rewards", "hours", "contact"];
}

/**
 * Coerce an arbitrary (client-supplied) object into a valid, safe
 * BusinessWebsiteContent. Never throws. `fallback` provides defaults for missing
 * fields (typically the business's stored content or a profile-seeded default).
 */
export function normalizeWebsiteContent(
  raw: unknown,
  fallback?: BusinessWebsiteContent,
): BusinessWebsiteContent {
  const base = fallback || defaultWebsiteContent();
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, any>;

  const fontPreset: FontPreset = hasKey(FONT_PRESETS, r.fontPreset) ? r.fontPreset : base.fontPreset;
  const heroStyle: HeroStyle = hasKey(HERO_STYLES, r.heroStyle) ? r.heroStyle : base.heroStyle;

  const gallery = Array.isArray(r.gallery)
    ? r.gallery.map(safeUrl).filter(Boolean).slice(0, LIMITS.gallery)
    : base.gallery;

  return {
    businessName: str(r.businessName ?? base.businessName, LIMITS.name),
    tagline: str(r.tagline ?? base.tagline, LIMITS.tagline),
    about: str(r.about ?? base.about, LIMITS.about),
    specials: str(r.specials ?? base.specials, LIMITS.specials),
    accentColor: normalizeHex(r.accentColor ?? base.accentColor),
    fontPreset,
    heroStyle,
    heroImage: r.heroImage !== undefined ? safeUrl(r.heroImage) : base.heroImage,
    sections: r.sections !== undefined ? normalizeSections(r.sections) : base.sections,
    contact: {
      phone: str(r.contact?.phone ?? base.contact.phone, LIMITS.contactField),
      email: str(r.contact?.email ?? base.contact.email, LIMITS.contactField),
      address: str(r.contact?.address ?? base.contact.address, LIMITS.contactField),
    },
    social: {
      facebook: safeUrl(r.social?.facebook ?? base.social.facebook),
      instagram: safeUrl(r.social?.instagram ?? base.social.instagram),
      twitter: safeUrl(r.social?.twitter ?? base.social.twitter),
      website: safeUrl(r.social?.website ?? base.social.website),
    },
    hours: r.hours !== undefined ? normalizeHours(r.hours) : base.hours,
    gallery,
  };
}

// Turn a business name into a URL slug candidate (route: /biz/:slug).
export function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "business";
}
