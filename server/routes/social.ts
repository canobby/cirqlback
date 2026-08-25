import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../auth";
import type { RouteDeps } from "./_shared";

// Social layer: friends (requests + leaderboard) and teams (join, roster, team
// leaderboard). Fresh /api/social/* paths — the legacy /api/teams/* routes are
// mock and left untouched. Team points are computed live from members' lifetime
// points, so nothing extra hooks the tap loop.
export function registerSocialRoutes(app: Express, _deps: RouteDeps) {
  // ── Friends ───────────────────────────────────────────────────────────────
  app.get("/api/social/friends", isAuthenticated, async (req, res) => {
    try { res.json(await storage.getFriends((req.user as any).id)); }
    catch (e) { console.error("Friends list error:", e); res.status(500).json({ error: "Failed to load friends" }); }
  });

  app.post("/api/social/friends/request", isAuthenticated, async (req, res) => {
    try {
      const me = req.user as any;
      const code = String(req.body?.code ?? "").trim();
      if (!code) return res.status(400).json({ error: "Enter a friend's code or email" });
      const friend = code.includes("@")
        ? await storage.getUserByEmail(code.toLowerCase())
        : await storage.getUserByReferralCode(code.toUpperCase());
      if (!friend) return res.status(404).json({ error: "No one found with that code or email" });
      if (friend.id === me.id) return res.status(400).json({ error: "You can't add yourself" });
      const existing = await storage.getFriendConnection(me.id, friend.id);
      if (existing) return res.status(409).json({ error: existing.status === "accepted" ? "Already friends" : "A request already exists" });
      await storage.createFriendRequest(me.id, friend.id);
      res.status(201).json({ ok: true });
    } catch (e) { console.error("Friend request error:", e); res.status(500).json({ error: "Failed to send request" }); }
  });

  app.post("/api/social/friends/respond", isAuthenticated, async (req, res) => {
    try {
      const fromId = String(req.body?.userId ?? "");
      const accept = req.body?.accept === true;
      const ok = await storage.respondFriendRequest(fromId, (req.user as any).id, accept);
      if (!ok) return res.status(404).json({ error: "No pending request" });
      res.json({ ok: true });
    } catch (e) { console.error("Friend respond error:", e); res.status(500).json({ error: "Failed to respond" }); }
  });

  app.post("/api/social/friends/remove", isAuthenticated, async (req, res) => {
    try { await storage.removeFriend((req.user as any).id, String(req.body?.userId ?? "")); res.json({ ok: true }); }
    catch (e) { console.error("Friend remove error:", e); res.status(500).json({ error: "Failed to remove friend" }); }
  });

  app.get("/api/social/friends/leaderboard", isAuthenticated, async (req, res) => {
    try { res.json(await storage.getFriendsLeaderboard((req.user as any).id)); }
    catch (e) { console.error("Friends leaderboard error:", e); res.status(500).json({ error: "Failed to load leaderboard" }); }
  });

  // ── Teams ─────────────────────────────────────────────────────────────────
  app.get("/api/social/teams/mine", isAuthenticated, async (req, res) => {
    try { res.json(await storage.getMyTeam((req.user as any).id)); }
    catch (e) { console.error("My team error:", e); res.status(500).json({ error: "Failed to load team" }); }
  });

  app.post("/api/social/teams", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id as string;
      if (await storage.getUserTeamMembership(userId)) return res.status(409).json({ error: "Leave your current team first" });
      const name = String(req.body?.name ?? "").trim().slice(0, 60);
      if (!name) return res.status(400).json({ error: "A team name is required" });
      const id = await storage.createTeam(name, typeof req.body?.description === "string" ? req.body.description.slice(0, 200) : null, userId);
      res.status(201).json({ id });
    } catch (e) { console.error("Create team error:", e); res.status(500).json({ error: "Failed to create team" }); }
  });

  app.get("/api/social/teams/discover", isAuthenticated, async (req, res) => {
    try { res.json(await storage.getDiscoverableTeams((req.user as any).id)); }
    catch (e) { console.error("Discover teams error:", e); res.status(500).json({ error: "Failed to load teams" }); }
  });

  app.post("/api/social/teams/:id/join", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id as string;
      if (await storage.getUserTeamMembership(userId)) return res.status(409).json({ error: "Leave your current team first" });
      const result = await storage.joinTeam(req.params.id, userId);
      if (!result.ok) return res.status(409).json({ error: result.error });
      res.json({ ok: true });
    } catch (e) { console.error("Join team error:", e); res.status(500).json({ error: "Failed to join team" }); }
  });

  app.post("/api/social/teams/:id/leave", isAuthenticated, async (req, res) => {
    try { await storage.leaveTeam((req.user as any).id, req.params.id); res.json({ ok: true }); }
    catch (e) { console.error("Leave team error:", e); res.status(500).json({ error: "Failed to leave team" }); }
  });

  app.get("/api/social/teams/leaderboard", isAuthenticated, async (req, res) => {
    try { res.json(await storage.getTeamLeaderboard(10)); }
    catch (e) { console.error("Team leaderboard error:", e); res.status(500).json({ error: "Failed to load leaderboard" }); }
  });
}
