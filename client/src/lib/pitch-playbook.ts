// Coordinator Pitch Assistant content — the field pitch for each business
// archetype, mirroring the Coordinator Sales Playbook. Used in the coordinator
// dashboard to generate a tailored pitch (and printable one-pager) per prospect.
// {biz} is replaced with the business name at render time.

export interface PitchObjection {
  q: string;
  a: string;
}

export interface PitchArchetype {
  key: string;
  label: string;
  emoji: string;
  hook: string;
  pain: string;
  leadFeatures: string[];
  pictureIt: string;
  roi: string;
  objection: PitchObjection;
  bundle: string;
  close: string;
}

export const ARCHETYPES: Record<string, PitchArchetype> = {
  cafe: {
    key: "cafe",
    label: "Café / Coffee shop",
    emoji: "☕",
    hook: "You know how paper punch cards get lost in a drawer? What if {biz}'s card lived on customers' phones and pulled them back on a slow morning?",
    pain: "Repeat business is everything, mornings are streaky, and punch cards get forgotten.",
    leadFeatures: [
      "Loyalty punch-card — tap a sticker each visit; the reward unlocks every Nth tap",
      "A hosted one-page website with today's specials",
      "A downtown coffee trail with the other cafés — you send each other customers",
    ],
    pictureIt: "They tap with each coffee. One away from a free latte? Nudge them — “your free latte's waiting.” That's a Tuesday visit you weren't getting.",
    roi: "It's $20/month. Average ticket around $6 — one extra return visit a week already covers it.",
    objection: {
      q: "“I already have a rewards app.”",
      a: "Does it put you on a shared map and run a trail with the other shops downtown? That's what brings new faces, not just repeat ones.",
    },
    bundle: "Core + Hosted Page (start on the free 6-month trial)",
    close: "First six months are free. Let's set up {biz}'s punch-card and get a sticker on the counter.",
  },
  restaurant: {
    key: "restaurant",
    label: "Restaurant",
    emoji: "🍽️",
    hook: "What if {biz}'s slow weeknights had their own reward — filling a few more tables without discounting the whole menu?",
    pain: "Thin weeknights, hard to measure what marketing works, no easy way to reward regulars.",
    leadFeatures: [
      "A weeknight loyalty or discount campaign",
      "Tap & redemption analytics — see what actually drives visits",
      "A hosted page as your menu-and-hours home online",
    ],
    pictureIt: "A “tap on your 3rd visit, dessert's on us” card. Regulars chase it; you see exactly how many redeemed it and when.",
    roi: "One extra table a week covers the whole month several times over — and you'll have the numbers to prove it.",
    objection: {
      q: "“I don't have time for another system.”",
      a: "You don't run it — customers tap, it tracks itself. You just redeem a code now and then, and I set the whole thing up for you today.",
    },
    bundle: "Core (add Advanced Analytics if they're data-driven)",
    close: "Free for six months. Let's put {biz}'s weeknight offer live before the dinner rush.",
  },
  bar: {
    key: "bar",
    label: "Bar / Brewery / Winery",
    emoji: "🍺",
    hook: "Want {biz} to be a must-stop on a tasting trail that sends groups from tap room to tap room?",
    pain: "Discovery — people don't know they exist, and weekend groups just follow the crowd.",
    leadFeatures: [
      "The cross-business tasting trail (the killer feature here)",
      "Map discovery so tourists and locals find you",
      "Contests & scavenger hunts for events and releases",
    ],
    pictureIt: "A “Yakima Ale Trail” — tap at four spots, earn a prize. Groups make a day of it and land on {biz} because you're on the map and the trail.",
    roi: "A trail brings in parties, not singles. One group of four on a slow Saturday is your whole month.",
    objection: {
      q: "“We're already busy on weekends.”",
      a: "This fills the weeknights and the shoulder season — and puts you in front of the tourists who don't know you yet.",
    },
    bundle: "Pro (for multi-stop trails + included hosted page) + Scavenger-Hunt Builder",
    close: "Let's get {biz} on the trail with the others — first six months free. Who else should I bring in?",
  },
  salon: {
    key: "salon",
    label: "Salon / Spa",
    emoji: "💇",
    hook: "What if the website you keep meaning to build for {biz} was live this afternoon — with your services, hours, and a rebooking nudge built in?",
    pain: "No real website, no-shows and gaps in the book, and rebooking is all manual.",
    leadFeatures: [
      "The hosted page — the “website you never built”",
      "Reminders that bring clients back in",
      "Custom Branding so it's unmistakably yours",
    ],
    pictureIt: "Your page with services, hours, and a photo gallery — share it on Instagram. Plus a “time for your next visit?” nudge to clients who favorited you.",
    roi: "Average service $50+? One rebooked client a month covers Core twice over — the page alone is worth it.",
    objection: {
      q: "“My clients aren't techy.”",
      a: "Nothing to download — they tap or click a link. And the page just gives them your info in one place; that part's for everyone.",
    },
    bundle: "Core + Hosted Page + Custom Branding",
    close: "Let's build {biz}'s page right now — free for six months — and get the link on your Instagram today.",
  },
  retail: {
    key: "retail",
    label: "Retail / Boutique",
    emoji: "🛍️",
    hook: "How do people find {biz} versus the shop two doors down? What if you were the highlighted pin on the local map?",
    pain: "Foot-traffic discovery, and competing with nearby shops and online.",
    leadFeatures: [
      "Map discovery + Map Priority placement",
      "A loyalty / points campaign for regulars",
      "A “shop-the-block” trail with your neighbors",
    ],
    pictureIt: "You're the boosted pin when someone browses shops nearby — and part of a “shop the block” trail that rewards visiting three stores.",
    roi: "A handful of map-driven walk-ins a month, average basket $30 — that's the plan paid for and then some.",
    objection: {
      q: "“I sell mostly online.”",
      a: "This is your local hook — it drives in-person visits and gives you a page to point everyone to. It complements the online side.",
    },
    bundle: "Core + Map Priority (+ Hosted Page if they lack a site)",
    close: "Let's get {biz} on the map and on the block trail — six months free to prove it out.",
  },
  generic: {
    key: "generic",
    label: "Local business",
    emoji: "🏪",
    hook: "Want more of {biz}'s customers coming back — and an easy way to get found by new ones nearby?",
    pain: "Repeat visits and local discovery are hard, and there's no simple way to reward regulars.",
    leadFeatures: [
      "Tap-to-earn rewards that bring customers back",
      "A hosted one-page website with your info and live rewards",
      "A spot on the local discovery map and shared neighborhood campaigns",
    ],
    pictureIt: "Customers tap a sticker to earn; when they're close to a reward, a nudge brings them back — and you show up on the map when people look nearby.",
    roi: "$20/month, and the first six are free. A couple of extra return visits a month cover it.",
    objection: {
      q: "“I'm not sure my customers will use it.”",
      a: "There's nothing to download — they tap a sticker or click a link, and the rewards are the draw.",
    },
    bundle: "Core (add the Hosted Page if they lack a website)",
    close: "Let's turn it on for {biz} — free for six months. Worst case, you stop.",
  },
};

// Ordered keyword match: category strings are freeform (from OSM/templates),
// e.g. "Coffee", "Brewery", "Nail Salon", "Boutique". First match wins; bar is
// checked before restaurant so "bar & grill" resolves to bar.
const MATCHERS: [string, RegExp][] = [
  ["bar", /\b(bar|pub|tavern|brew|brewer|brewery|beer|winery|wine|vineyard|taproom|tap room|distiller|cider|cocktail|lounge)\b/i],
  ["salon", /\b(salon|spa|barber|nail|hair|beauty|massage|wax|lash|brow|esthetic)\b/i],
  ["cafe", /\b(caf[eé]|coffee|espresso|tea|bakery|baker|donut|doughnut|bagel|patisserie|roaster)\b/i],
  ["retail", /\b(retail|shop|store|boutique|gift|apparel|clothing|clothes|book|jewel|florist|market|grocer|antique|thrift)\b/i],
  ["restaurant", /\b(restaurant|diner|eatery|grill|kitchen|pizza|pizzeria|taco|taquer|mexican|thai|sushi|ramen|deli|bbq|barbecue|steak|burger|sandwich|bistro|food|cuisine|noodle|pho)\b/i],
];

export function archetypeForCategory(category?: string | null): PitchArchetype {
  const c = (category || "").toLowerCase();
  for (const [key, re] of MATCHERS) {
    if (re.test(c)) return ARCHETYPES[key];
  }
  return ARCHETYPES.generic;
}

// Replace the {biz} token with the business name (or a neutral fallback).
export function fill(text: string, businessName?: string | null): string {
  return text.replace(/\{biz\}/g, (businessName || "").trim() || "your shop");
}
