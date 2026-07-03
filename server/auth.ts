import type { Express, RequestHandler } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { z } from "zod";

import { eq } from "drizzle-orm";

import { pool, db } from "./db";
import { storage } from "./storage";
import { adminUsers, type User } from "@shared/schema";

const scryptAsync = promisify(scrypt);

// --- Password hashing (Node built-in scrypt; no native deps) ---------------

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, key] = (stored ?? "").split(":");
  if (!salt || !key) return false;
  const keyBuf = Buffer.from(key, "hex");
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return keyBuf.length === derived.length && timingSafeEqual(keyBuf, derived);
}

// Strip secrets before sending a user to the client.
function sanitize(user: User) {
  const { passwordHash, ...safe } = user as User & { passwordHash?: string | null };
  return safe;
}

// --- Auth middleware --------------------------------------------------------

export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated?.() && req.user) return next();
  return res.status(401).json({ message: "Unauthorized" });
};

/**
 * Requires a logged-in session user who ALSO has an active admin_users record.
 * On success, attaches the admin row to req.adminUser (for adminLevel checks).
 * 401 if not logged in, 403 if logged in but not an active admin.
 */
export const isAdminAuthenticated: RequestHandler = async (req, res, next) => {
  if (!req.isAuthenticated?.() || !req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  try {
    const [admin] = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.userId, (req.user as User).id));
    if (!admin || admin.isActive === false) {
      return res.status(403).json({ message: "Admin access required" });
    }
    (req as any).adminUser = admin;
    return next();
  } catch (err) {
    return next(err as Error);
  }
};

/**
 * Requires a logged-in session user who ALSO has an active `coordinators`
 * record (CHR-31). On success, attaches it to req.coordinator.
 * 401 if not logged in, 403 if logged in but not an active coordinator.
 */
export const isCoordinator: RequestHandler = async (req, res, next) => {
  if (!req.isAuthenticated?.() || !req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  try {
    const coordinator = await storage.getCoordinatorByUserId((req.user as User).id);
    if (!coordinator || coordinator.isActive === false) {
      return res.status(403).json({ message: "Coordinator access required" });
    }
    (req as any).coordinator = coordinator;
    return next();
  } catch (err) {
    return next(err as Error);
  }
};

// --- Setup ------------------------------------------------------------------

const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  // Self-service signups may only be customers or merchants; admins are provisioned separately.
  role: z.enum(["customer", "merchant"]).optional(),
});

export function setupAuth(app: Express) {
  const isProd = process.env.NODE_ENV === "production";

  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) {
    console.warn(
      "[auth] SESSION_SECRET is not set — using an insecure ephemeral secret. " +
        "Set SESSION_SECRET in .env; sessions will not survive a restart until you do.",
    );
  }

  const PgStore = connectPg(session);
  const sessionStore = new PgStore({
    pool,
    tableName: "sessions",
    createTableIfMissing: false,
  });

  if (isProd) app.set("trust proxy", 1);

  app.use(
    session({
      store: sessionStore,
      secret: sessionSecret || randomBytes(32).toString("hex"),
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: {
        httpOnly: true,
        secure: isProd,
        sameSite: "lax",
        maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
      },
    }),
  );

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      { usernameField: "email", passwordField: "password" },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email.toLowerCase().trim());
          if (!user || !user.passwordHash) {
            return done(null, false, { message: "Invalid email or password" });
          }
          const ok = await verifyPassword(password, user.passwordHash);
          if (!ok) return done(null, false, { message: "Invalid email or password" });
          return done(null, user);
        } catch (err) {
          return done(err as Error);
        }
      },
    ),
  );

  passport.serializeUser((user, done) => done(null, (user as User).id));
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user ?? false);
    } catch (err) {
      done(err as Error);
    }
  });

  // --- Routes ---------------------------------------------------------------

  app.post("/api/auth/register", async (req, res, next) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten() });
    }
    const { email, password, firstName, lastName, role } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    try {
      const existing = await storage.getUserByEmail(normalizedEmail);
      if (existing) {
        return res.status(409).json({ message: "An account with that email already exists" });
      }

      const passwordHash = await hashPassword(password);
      const user = await storage.createUser({
        email: normalizedEmail,
        passwordHash,
        firstName,
        lastName,
        role: role ?? "customer",
      });

      // Establish a session for the newly registered user.
      req.login(user, (err) => {
        if (err) return next(err);
        return res.status(201).json(sanitize(user));
      });
    } catch (err) {
      return next(err);
    }
  });

  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: unknown, user: User | false, info?: { message?: string }) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message ?? "Invalid email or password" });
      req.login(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        return res.json(sanitize(user));
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      req.session.destroy(() => {
        res.clearCookie("connect.sid");
        return res.status(204).end();
      });
    });
  });

  app.get("/api/auth/user", (req, res) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const safe = sanitize(req.user as User);
    const impersonatorEmail = (req.session as any)?.impersonatorEmail;
    // Flag impersonation so the client can show a "viewing as" banner.
    if ((req.session as any)?.impersonatorId) {
      return res.json({ ...safe, _impersonating: true, _impersonatorEmail: impersonatorEmail });
    }
    return res.json(safe);
  });

  // Stop impersonating and return to the original admin session. Not admin-gated
  // (while impersonating, req.user is the target); the session's impersonatorId
  // is the proof that an admin started it.
  app.post("/api/auth/stop-impersonate", async (req, res, next) => {
    const impersonatorId = (req.session as any)?.impersonatorId;
    if (!impersonatorId) return res.status(400).json({ message: "Not impersonating" });
    try {
      const admin = await storage.getUser(impersonatorId);
      if (!admin) return res.status(400).json({ message: "Original admin not found" });
      req.login(admin, (err) => {
        if (err) return next(err);
        delete (req.session as any).impersonatorId;
        delete (req.session as any).impersonatorEmail;
        return res.json({ success: true });
      });
    } catch (err) {
      return next(err as Error);
    }
  });
}
