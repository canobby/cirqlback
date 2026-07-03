import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../auth";
import type { RouteDeps } from "./_shared";
import type { MessageThread, Message } from "@shared/schema";

// ── Cross-role messaging (Slice 1: Coordinator ↔ Business) ──────────────────
// One generic router, mounted for any authenticated user. The actor's role in a
// given thread is resolved server-side (never trusted from the client): they are
// the "coordinator" party if they own that thread's coordinator record, or the
// "business" party if they own that thread's business. Everyone else is a
// non-participant (403). In-app only for now — no email/push delivery.
//
// Direction (Slice 1): a coordinator may start a thread with any business in
// their territory; a business may start a thread with the coordinator that owns
// its territory. Once a thread exists, either party may reply. Admin oversight
// (read-any) is a later slice; the tables already support it via contextType.

const SUBJECT_MAX = 150;
const BODY_MAX = 4000;

type ActorContext = {
  userId: string;
  coordinatorId: string | null;
  businessIds: string[];
};

async function resolveActor(req: any): Promise<ActorContext> {
  const userId = (req.user as any).id as string;
  const [coordinator, owned] = await Promise.all([
    storage.getCoordinatorByUserId(userId),
    storage.getBusinessesByOwner(userId),
  ]);
  return {
    userId,
    coordinatorId: coordinator && coordinator.isActive !== false ? coordinator.id : null,
    businessIds: owned.map((b) => b.id),
  };
}

function roleInThread(thread: MessageThread, actor: ActorContext): "coordinator" | "business" | null {
  if (actor.coordinatorId && thread.coordinatorId === actor.coordinatorId) return "coordinator";
  if (thread.businessId && actor.businessIds.includes(thread.businessId)) return "business";
  return null;
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

  // The actor's inbox: every thread they participate in, newest activity first.
  app.get("/api/messages/threads", isAuthenticated, async (req, res) => {
    try {
      const actor = await resolveActor(req);
      const [asCoord, asBiz] = await Promise.all([
        actor.coordinatorId
          ? storage.getMessageThreadsForCoordinator(actor.coordinatorId)
          : Promise.resolve([] as MessageThread[]),
        storage.getMessageThreadsForBusinessIds(actor.businessIds),
      ]);
      // Dedupe (a user could conceivably be both parties) and sort by activity.
      const byId = new Map<string, MessageThread>();
      for (const t of [...asCoord, ...asBiz]) byId.set(t.id, t);
      const threads = Array.from(byId.values()).sort(
        (a, b) => new Date(b.lastMessageAt ?? 0).getTime() - new Date(a.lastMessageAt ?? 0).getTime(),
      );

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
        const counterpartName =
          role === "coordinator"
            ? (t.businessId && bizNames.get(t.businessId)) || "Business"
            : (t.coordinatorId && coordNames.get(t.coordinatorId)) || "Coordinator";
        return {
          id: t.id,
          subject: t.subject,
          status: t.status,
          myRole: role,
          counterpartName,
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
      const [asCoord, asBiz] = await Promise.all([
        actor.coordinatorId
          ? storage.getMessageThreadsForCoordinator(actor.coordinatorId)
          : Promise.resolve([] as MessageThread[]),
        storage.getMessageThreadsForBusinessIds(actor.businessIds),
      ]);
      const byId = new Map<string, MessageThread>();
      for (const t of [...asCoord, ...asBiz]) byId.set(t.id, t);
      const threads = Array.from(byId.values());
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
      const counterpartName =
        role === "coordinator"
          ? (thread.businessId && bizNames.get(thread.businessId)) || "Business"
          : (thread.coordinatorId && coordNames.get(thread.coordinatorId)) || "Coordinator";

      res.json({
        thread: {
          id: thread.id,
          subject: thread.subject,
          status: thread.status,
          myRole: role,
          counterpartName,
          createdAt: thread.createdAt,
        },
        messages,
      });
    } catch (error) {
      console.error("Get message thread error:", error);
      res.status(500).json({ error: "Failed to load thread" });
    }
  });

  // Start a new thread. `businessId` identifies the business party; the server
  // infers the actor's direction and the coordinator party.
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
        // Coordinator → a business in their territory.
        coordinatorId = actor.coordinatorId;
        senderRole = "coordinator";
      } else if (actor.businessIds.includes(businessId)) {
        // Business → the coordinator that owns its territory.
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
      await storage.createMessage({
        threadId: thread.id,
        senderId: actor.userId,
        senderRole,
        body,
      });
      res.status(201).json({ id: thread.id });
    } catch (error) {
      console.error("Create message thread error:", error);
      res.status(500).json({ error: "Failed to start conversation" });
    }
  });

  // Reply to an existing thread.
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
}
