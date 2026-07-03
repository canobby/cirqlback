import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../auth";
import type { RouteDeps } from "./_shared";
import type { MessageThread, Message } from "@shared/schema";

// ── Cross-role messaging ────────────────────────────────────────────────────
// One generic router, mounted for any authenticated user. The actor's role in a
// given thread is resolved server-side (never trusted from the client).
//
// Slice 1 — Coordinator ↔ Business (context_type='coordinator_business'):
//   a coordinator may start a thread with any business in their territory; a
//   business may start a thread with the coordinator that owns its territory.
//
// Slice 2 — Admin support + broadcasts:
//   • Admin support (context_type='admin_support') reuses these same tables:
//     admin↔business sets businessId, admin↔coordinator sets coordinatorId. Any
//     active platform admin is the "admin" party (support-queue model); the
//     counterpart is the business owner / coordinator. Admin endpoints live under
//     the already-gated /api/admin/* prefix.
//   • Broadcasts are one-way announcements from an admin to a role audience,
//     surfaced in each recipient's feed with a per-user unread watermark.
//
// In-app only for now — no email/push delivery.

const SUBJECT_MAX = 150;
const BODY_MAX = 4000;

type ThreadRole = "coordinator" | "business" | "admin";

type ActorContext = {
  userId: string;
  coordinatorId: string | null;
  businessIds: string[];
  isAdmin: boolean;
};

async function resolveActor(req: any): Promise<ActorContext> {
  const userId = (req.user as any).id as string;
  const [coordinator, owned, isAdmin] = await Promise.all([
    storage.getCoordinatorByUserId(userId),
    storage.getBusinessesByOwner(userId),
    storage.isPlatformAdmin(userId),
  ]);
  return {
    userId,
    coordinatorId: coordinator && coordinator.isActive !== false ? coordinator.id : null,
    businessIds: owned.map((b) => b.id),
    isAdmin,
  };
}

function roleInThread(thread: MessageThread, actor: ActorContext): ThreadRole | null {
  if (thread.contextType === "admin_support") {
    if (actor.isAdmin) return "admin";
    if (thread.businessId && actor.businessIds.includes(thread.businessId)) return "business";
    if (actor.coordinatorId && thread.coordinatorId === actor.coordinatorId) return "coordinator";
    return null;
  }
  // coordinator_business
  if (actor.coordinatorId && thread.coordinatorId === actor.coordinatorId) return "coordinator";
  if (thread.businessId && actor.businessIds.includes(thread.businessId)) return "business";
  return null;
}

// Which broadcast audiences a user should receive (admins are senders, not
// recipients). Customers get their feed in a later slice.
function roleBuckets(actor: ActorContext): string[] {
  const b: string[] = [];
  if (actor.coordinatorId) b.push("coordinators");
  if (actor.businessIds.length) b.push("businesses");
  return b;
}

export function registerMessageRoutes(app: Express, _deps: RouteDeps) {
  // Resolve display names for a set of threads without N+1 surprises.
  async function nameLookups(threads: MessageThread[]) {
    const bizIds = Array.from(new Set(threads.map((t) => t.businessId).filter(Boolean))) as string[];
    const coordIds = Array.from(new Set(threads.map((t) => t.coordinatorId).filter(Boolean))) as string[];
    const bizNames = new Map<string, string>();
    const coordNames = new Map<string, string>();
    await Promise.all([
      ...bizIds.map(async (id) => {
        const b = await storage.getBusiness(id);
        if (b) bizNames.set(id, b.name);
      }),
      ...coordIds.map(async (id) => {
        const c = await storage.getCoordinator(id);
        if (c) coordNames.set(id, c.displayName || "Coordinator");
      }),
    ]);
    return { bizNames, coordNames };
  }

  // The label the viewer sees for "the other side" of a thread.
  function counterpartName(
    thread: MessageThread,
    role: ThreadRole,
    bizNames: Map<string, string>,
    coordNames: Map<string, string>,
  ): string {
    const bizName = (thread.businessId && bizNames.get(thread.businessId)) || "Business";
    const coordName = (thread.coordinatorId && coordNames.get(thread.coordinatorId)) || "Coordinator";
    if (thread.contextType === "admin_support") {
      // The admin sees who they're helping; the counterpart sees "Support".
      if (role === "admin") return thread.businessId ? bizName : coordName;
      return "Cirqlback Support";
    }
    return role === "coordinator" ? bizName : coordName;
  }

  // Every thread the actor participates in (admins also see the support queue).
  async function inboxThreads(actor: ActorContext): Promise<MessageThread[]> {
    const [asCoord, asBiz, asAdmin] = await Promise.all([
      actor.coordinatorId
        ? storage.getMessageThreadsForCoordinator(actor.coordinatorId)
        : Promise.resolve([] as MessageThread[]),
      storage.getMessageThreadsForBusinessIds(actor.businessIds),
      actor.isAdmin ? storage.getAdminSupportThreads() : Promise.resolve([] as MessageThread[]),
    ]);
    const byId = new Map<string, MessageThread>();
    for (const t of [...asCoord, ...asBiz, ...asAdmin]) byId.set(t.id, t);
    return Array.from(byId.values()).sort(
      (a, b) => new Date(b.lastMessageAt ?? 0).getTime() - new Date(a.lastMessageAt ?? 0).getTime(),
    );
  }

  // The actor's inbox: every thread they participate in, newest activity first.
  app.get("/api/messages/threads", isAuthenticated, async (req, res) => {
    try {
      const actor = await resolveActor(req);
      const threads = await inboxThreads(actor);
      const msgs = await storage.getMessagesForThreads(threads.map((t) => t.id));
      const byThread = new Map<string, Message[]>();
      for (const m of msgs) {
        const arr = byThread.get(m.threadId) ?? [];
        arr.push(m);
        byThread.set(m.threadId, arr);
      }
      const { bizNames, coordNames } = await nameLookups(threads);

      const summaries = threads.map((t) => {
        const role = roleInThread(t, actor)!; // guaranteed participant here
        const tm = byThread.get(t.id) ?? [];
        const last = tm[tm.length - 1];
        const unread = tm.filter((m) => !m.readAt && m.senderRole !== role).length;
        return {
          id: t.id,
          subject: t.subject,
          status: t.status,
          kind: t.contextType,
          myRole: role,
          counterpartName: counterpartName(t, role, bizNames, coordNames),
          lastMessagePreview: last ? last.body.slice(0, 140) : null,
          lastMessageAt: t.lastMessageAt,
          messageCount: tm.length,
          unreadCount: unread,
        };
      });
      res.json(summaries);
    } catch (error) {
      console.error("List message threads error:", error);
      res.status(500).json({ error: "Failed to load messages" });
    }
  });

  // Unread total across the actor's inbox (for the hub badge).
  app.get("/api/messages/unread-count", isAuthenticated, async (req, res) => {
    try {
      const actor = await resolveActor(req);
      const threads = await inboxThreads(actor);
      const msgs = await storage.getMessagesForThreads(threads.map((t) => t.id));
      const roleByThread = new Map(threads.map((t) => [t.id, roleInThread(t, actor)] as const));
      const count = msgs.filter((m) => !m.readAt && m.senderRole !== roleByThread.get(m.threadId)).length;
      res.json({ count });
    } catch (error) {
      console.error("Unread count error:", error);
      res.status(500).json({ error: "Failed to load unread count" });
    }
  });

  // A single thread + its messages. Opening it marks the counterpart's messages
  // read for the viewer.
  app.get("/api/messages/threads/:id", isAuthenticated, async (req, res) => {
    try {
      const actor = await resolveActor(req);
      const thread = await storage.getMessageThread(req.params.id);
      if (!thread) return res.status(404).json({ error: "Thread not found" });
      const role = roleInThread(thread, actor);
      if (!role) return res.status(403).json({ error: "Not a participant in this thread" });

      await storage.markThreadReadForRole(thread.id, role);
      const messages = await storage.getMessagesForThread(thread.id);
      const { bizNames, coordNames } = await nameLookups([thread]);

      res.json({
        thread: {
          id: thread.id,
          subject: thread.subject,
          status: thread.status,
          kind: thread.contextType,
          myRole: role,
          counterpartName: counterpartName(thread, role, bizNames, coordNames),
          createdAt: thread.createdAt,
        },
        messages,
      });
    } catch (error) {
      console.error("Get message thread error:", error);
      res.status(500).json({ error: "Failed to load thread" });
    }
  });

  // Start a new thread (Slice 1 direction: coordinator↔business). `businessId`
  // identifies the business party; the server infers direction + coordinator.
  app.post("/api/messages/threads", isAuthenticated, async (req, res) => {
    try {
      const actor = await resolveActor(req);
      const businessId = String(req.body?.businessId ?? "").trim();
      const subject = String(req.body?.subject ?? "").trim().slice(0, SUBJECT_MAX);
      const body = String(req.body?.body ?? "").trim().slice(0, BODY_MAX);
      if (!businessId) return res.status(400).json({ error: "businessId is required" });
      if (!subject) return res.status(400).json({ error: "A subject is required" });
      if (!body) return res.status(400).json({ error: "A message is required" });

      let coordinatorId: string | null = null;
      let senderRole: "coordinator" | "business";

      if (actor.coordinatorId && (await storage.coordinatorOwnsBusiness(actor.coordinatorId, businessId))) {
        coordinatorId = actor.coordinatorId;
        senderRole = "coordinator";
      } else if (actor.businessIds.includes(businessId)) {
        const coordinator = await storage.getCoordinatorForBusiness(businessId);
        if (!coordinator) {
          return res
            .status(400)
            .json({ error: "Your business isn't assigned to a coordinator territory yet." });
        }
        coordinatorId = coordinator.id;
        senderRole = "business";
      } else {
        return res.status(403).json({ error: "You can't message this business." });
      }

      const thread = await storage.createMessageThread({
        subject,
        coordinatorId,
        businessId,
        contextType: "coordinator_business",
        createdBy: actor.userId,
      });
      await storage.createMessage({ threadId: thread.id, senderId: actor.userId, senderRole, body });
      res.status(201).json({ id: thread.id });
    } catch (error) {
      console.error("Create message thread error:", error);
      res.status(500).json({ error: "Failed to start conversation" });
    }
  });

  // Reply to an existing thread (any participant, any thread kind).
  app.post("/api/messages/threads/:id/messages", isAuthenticated, async (req, res) => {
    try {
      const actor = await resolveActor(req);
      const thread = await storage.getMessageThread(req.params.id);
      if (!thread) return res.status(404).json({ error: "Thread not found" });
      const role = roleInThread(thread, actor);
      if (!role) return res.status(403).json({ error: "Not a participant in this thread" });

      const body = String(req.body?.body ?? "").trim().slice(0, BODY_MAX);
      if (!body) return res.status(400).json({ error: "A message is required" });

      const message = await storage.createMessage({
        threadId: thread.id,
        senderId: actor.userId,
        senderRole: role,
        body,
      });
      res.status(201).json(message);
    } catch (error) {
      console.error("Reply to thread error:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // ── Broadcast feed (recipient side) ───────────────────────────────────────
  app.get("/api/messages/broadcasts", isAuthenticated, async (req, res) => {
    try {
      const actor = await resolveActor(req);
      const [feed, lastSeen] = await Promise.all([
        storage.getBroadcastFeed(roleBuckets(actor)),
        storage.getBroadcastLastSeen(actor.userId),
      ]);
      const seenAt = lastSeen ? new Date(lastSeen).getTime() : 0;
      const unread = feed.filter((b) => new Date(b.createdAt ?? 0).getTime() > seenAt).length;
      res.json({ broadcasts: feed, unread });
    } catch (error) {
      console.error("Broadcast feed error:", error);
      res.status(500).json({ error: "Failed to load announcements" });
    }
  });

  // Mark the actor's announcements as seen (advances their watermark).
  app.post("/api/messages/broadcasts/seen", isAuthenticated, async (req, res) => {
    try {
      const actor = await resolveActor(req);
      await storage.markBroadcastsSeen(actor.userId);
      res.json({ ok: true });
    } catch (error) {
      console.error("Mark broadcasts seen error:", error);
      res.status(500).json({ error: "Failed to update" });
    }
  });

  // ── Admin endpoints (gated by the /api/admin/* prefix in routes.ts) ───────

  // Who an admin can start a support thread with: coordinators + claimed
  // businesses (both have an account to receive it).
  app.get("/api/admin/messages/targets", async (_req, res) => {
    try {
      const [coordinators, businesses] = await Promise.all([
        storage.listCoordinators(),
        storage.getBusinesses(),
      ]);
      res.json({
        coordinators: coordinators.map((c: any) => ({ id: c.id, name: c.displayName || "Coordinator" })),
        businesses: businesses
          .filter((b: any) => b.ownerId)
          .map((b: any) => ({ id: b.id, name: b.name })),
      });
    } catch (error) {
      console.error("Admin message targets error:", error);
      res.status(500).json({ error: "Failed to load recipients" });
    }
  });

  // Admin starts a support thread with a business or a coordinator.
  app.post("/api/admin/messages/threads", async (req, res) => {
    try {
      const adminId = (req.user as any).id as string;
      const targetType = String(req.body?.targetType ?? "");
      const targetId = String(req.body?.targetId ?? "").trim();
      const subject = String(req.body?.subject ?? "").trim().slice(0, SUBJECT_MAX);
      const body = String(req.body?.body ?? "").trim().slice(0, BODY_MAX);
      if (!targetId) return res.status(400).json({ error: "A recipient is required" });
      if (!subject) return res.status(400).json({ error: "A subject is required" });
      if (!body) return res.status(400).json({ error: "A message is required" });

      let businessId: string | null = null;
      let coordinatorId: string | null = null;
      if (targetType === "business") {
        const biz = await storage.getBusiness(targetId);
        if (!biz) return res.status(404).json({ error: "Business not found" });
        businessId = biz.id;
      } else if (targetType === "coordinator") {
        const coord = await storage.getCoordinator(targetId);
        if (!coord) return res.status(404).json({ error: "Coordinator not found" });
        coordinatorId = coord.id;
      } else {
        return res.status(400).json({ error: "targetType must be 'business' or 'coordinator'" });
      }

      const thread = await storage.createMessageThread({
        subject,
        coordinatorId: coordinatorId as any,
        businessId: businessId as any,
        contextType: "admin_support",
        createdBy: adminId,
      });
      await storage.createMessage({ threadId: thread.id, senderId: adminId, senderRole: "admin", body });
      res.status(201).json({ id: thread.id });
    } catch (error) {
      console.error("Admin create support thread error:", error);
      res.status(500).json({ error: "Failed to start conversation" });
    }
  });

  // Admin sends a broadcast to a role audience.
  app.post("/api/admin/broadcasts", async (req, res) => {
    try {
      const adminId = (req.user as any).id as string;
      const audience = String(req.body?.audience ?? "");
      const subject = String(req.body?.subject ?? "").trim().slice(0, SUBJECT_MAX);
      const body = String(req.body?.body ?? "").trim().slice(0, BODY_MAX);
      const ALLOWED = ["all", "coordinators", "businesses", "customers"];
      if (!ALLOWED.includes(audience)) return res.status(400).json({ error: "Invalid audience" });
      if (!subject) return res.status(400).json({ error: "A subject is required" });
      if (!body) return res.status(400).json({ error: "A message is required" });
      const row = await storage.createBroadcast({ senderUserId: adminId, audience, subject, body });
      res.status(201).json(row);
    } catch (error) {
      console.error("Admin create broadcast error:", error);
      res.status(500).json({ error: "Failed to send broadcast" });
    }
  });

  // Admin: broadcasts already sent (history).
  app.get("/api/admin/broadcasts", async (_req, res) => {
    try {
      res.json(await storage.getSentBroadcasts());
    } catch (error) {
      console.error("Admin list broadcasts error:", error);
      res.status(500).json({ error: "Failed to load broadcasts" });
    }
  });
}
