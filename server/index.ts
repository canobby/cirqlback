import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// --- Security middleware (CHR-17) ---
// CSP/COEP are disabled because the SPA embeds Google Maps, Stripe and Google
// Fonts; a proper Content-Security-Policy is a separate, larger task.
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

const isProdEnv = process.env.NODE_ENV === "production";
const allowedOrigins = (process.env.CORS_ORIGINS ||
  "http://localhost:5000,http://127.0.0.1:5000")
  .split(",").map((s) => s.trim()).filter(Boolean);
app.use(cors({
  origin(origin, cb) {
    // Allow same-origin / non-browser requests (no Origin header) + allowlist.
    // In development, reflect any origin so the app can be shared over LAN or a
    // tunnel (e.g. to show a partner) without editing CORS_ORIGINS per URL.
    // Production stays strict — only the configured allowlist is accepted.
    if (!origin || !isProdEnv || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));

// Global rate limit, with tighter limits on auth and AI/translation endpoints
// (unauthenticated AI/payment calls are a cost-amplification/DoS risk).
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 1000, standardHeaders: true, legacyHeaders: false }));
const strictLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 50, standardHeaders: true, legacyHeaders: false });
app.use("/api/auth", strictLimiter);
app.use("/api/translate", strictLimiter);
app.use("/api/ai", strictLimiter);

// Capture the raw body so the Stripe webhook can verify signatures
// (stripe.webhooks.constructEvent needs the exact bytes, not parsed JSON).
app.use(express.json({ verify: (req, _res, buf) => { (req as any).rawBody = buf; } }));
app.use(express.urlencoded({ extended: false }));

// Request logger — status + timing only. (CHR-18) It previously serialized the
// JSON response body into the log, leaking PII (emails, subscription/admin data).
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  res.on("finish", () => {
    if (path.startsWith("/api")) {
      const duration = Date.now() - start;
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });
  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // (CHR-18) Don't re-throw after responding — that crashed the process and
    // could double-send. Log server-side and return a clean error.
    console.error("Unhandled error:", err);
    if (!res.headersSent) {
      res.status(status).json({ message });
    }
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  // Production hosts (Render/Railway/etc.) route to the container's public
  // interface, so bind 0.0.0.0 there; keep localhost-only in development.
  const host = process.env.HOST || (isProdEnv ? "0.0.0.0" : "127.0.0.1");
  server.listen(port, host, () => {
    log(`serving on http://${host}:${port}`);
  });
})();
