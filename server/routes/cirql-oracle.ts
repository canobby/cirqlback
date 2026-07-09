import type { Express, Request } from "express";
import { z } from "zod";
import { openaiService, type AssistantTurn } from "../openai-service";
import { isRingId, type OracleSpeaker } from "../cirql-oracle-knowledge";
import type { RouteDeps } from "./_shared";

// The CIRQL Fountain Oracle + ring NPCs — the in-world AI info hub.
//
// This is PUBLIC (the tile-world at /cirqlsphere / /tile-lab needs no login), so it
// must guard itself: a lightweight in-memory per-IP rate limiter curbs cost/abuse,
// message length + count are capped, and (like the dashboard assistant) it returns a
// graceful 503 when OPENAI_API_KEY isn't configured. Kids-safety is enforced in the
// grounded system prompt (see openai-service.buildOracleMessages).

// ---- tiny in-memory per-IP rate limiter (no external dep; resets on restart) ----
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_PER_WINDOW = 40;        // messages per IP per window
const MIN_INTERVAL_MS = 1200;     // debounce rapid-fire
type Bucket = { count: number; windowStart: number; last: number };
const buckets = new Map<string, Bucket>();

function clientIp(req: Request): string {
  const fwd = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim();
  return fwd || req.socket.remoteAddress || "unknown";
}

// Returns null if allowed, or a { status, error } to send back.
function rateLimit(ip: string): { status: number; error: string } | null {
  const now = Date.now();
  let b = buckets.get(ip);
  if (!b || now - b.windowStart > WINDOW_MS) {
    b = { count: 0, windowStart: now, last: 0 };
    buckets.set(ip, b);
  }
  if (now - b.last < MIN_INTERVAL_MS) {
    return { status: 429, error: "One moment — the water needs to settle. Try again in a second." };
  }
  if (b.count >= MAX_PER_WINDOW) {
    return { status: 429, error: "The Fountain needs to rest a while. Please come back in a few minutes." };
  }
  b.count++;
  b.last = now;
  return null;
}

// Occasionally sweep stale buckets so the map can't grow unbounded.
function sweep() {
  const now = Date.now();
  const stale: string[] = [];
  buckets.forEach((b, ip) => { if (now - b.windowStart > WINDOW_MS) stale.push(ip); });
  for (const ip of stale) buckets.delete(ip);
}

export function registerCirqlOracleRoutes(app: Express, _deps: RouteDeps) {
  const speakerSchema = z.union([
    z.object({ kind: z.literal("oracle") }),
    z.object({
      kind: z.literal("npc"),
      ring: z.string().refine(isRingId, "unknown ring"),
      name: z.string().min(1).max(40),
      role: z.string().min(1).max(80),
    }),
  ]);

  const bodySchema = z.object({
    speaker: speakerSchema,
    stream: z.boolean().optional(),
    messages: z
      .array(
        z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string().min(1).max(600),
        }),
      )
      .min(1)
      .max(16),
  });

  app.post("/api/cirql/oracle/chat", async (req, res) => {
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    }

    if (buckets.size > 5000) sweep();
    const limited = rateLimit(clientIp(req));
    if (limited) return res.status(limited.status).json({ error: limited.error });

    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({
        error: "The Fountain is quiet right now — its Oracle hasn't woken on this shore yet. (The world's guide needs an OpenAI key configured.)",
      });
    }

    const speaker = parsed.data.speaker as OracleSpeaker;
    const messages = parsed.data.messages as AssistantTurn[];
    const stream = parsed.data.stream;

    if (stream) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders?.();
      try {
        for await (const delta of openaiService.streamOracleAnswer(speaker, messages)) {
          res.write(`data: ${JSON.stringify({ delta })}\n\n`);
        }
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      } catch (err) {
        console.error("oracle stream error:", err);
        res.write(`data: ${JSON.stringify({ error: "The water clouds over… try asking again in a moment." })}\n\n`);
      }
      return res.end();
    }

    try {
      const reply = await openaiService.answerOracleQuestion(speaker, messages);
      res.json({ reply });
    } catch (err) {
      console.error("oracle chat error:", err);
      res.status(500).json({ error: "The water clouds over… try asking again in a moment." });
    }
  });
}
