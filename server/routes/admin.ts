import type { Express } from "express";
import { storage, COORDINATOR_SHARE_MIN, COORDINATOR_SHARE_MAX } from "../storage";
import { db } from "../db";
import { adminUsers, adminCommunications, adminTrainingProgress, adminTrainingModules, adminKnowledgeItems } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { insertBusinessSchema, insertCampaignSchema, insertNfcTagSchema, insertTapSchema, insertRewardSchema, insertTapTrailSchema, insertReferralSchema, insertSubscriptionPlanSchema, insertUserSubscriptionSchema, insertApiUsageSchema, insertSalesDataSchema, insertMonthlySalesSummarySchema, insertBusinessGoalsSchema, salesData, monthlySalesSummary, businessGoals } from "@shared/schema";
import { z } from "zod";
import crypto from "crypto";
import { openaiService } from "../openai-service";
import { isAuthenticated, isAdminAuthenticated } from "../auth";
import { PLAN_PRICING, resolvePlanAmountCents, type BillingInterval } from "../pricing";
import { CAMPAIGN_TEMPLATES } from "./coordinator";
import type { RouteDeps } from "./_shared";

export function registerAdminRoutes(app: Express, deps: RouteDeps) {
  const { userOwnsBusiness } = deps;

  // Record a privileged admin action to the audit log (fire-and-forget).
  const audit = (req: any, action: string, targetType?: string, targetId?: string, detail?: string) =>
    storage.logAdminAction({
      adminUserId: req.user?.id ?? null,
      adminEmail: req.user?.email ?? null,
      action, targetType, targetId, detail,
    });

  // Admin Invitation and Management Routes - ADMIN ONLY ACCESS
  // These routes are only accessible by admin users and hidden from regular users/customers
  
  app.post("/api/admin/invite", async (req, res) => {
    try {
      // Only master admins may invite other admins.
      if ((req as any).adminUser?.adminLevel !== 'master') {
        return res.status(403).json({ error: "Master admin access required" });
      }

      const { email, adminLevel, specializations, personalMessage, emergencyContact } = req.body;
      
      // Generate secure invitation token
      const inviteToken = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days to accept

      // Store invitation (mock implementation for now)
      const invitation = {
        id: crypto.randomUUID(),
        invitationEmail: email,
        adminLevel,
        specializations,
        inviteToken,
        inviteExpiresAt: expiresAt,
        personalMessage,
        emergencyContact,
        createdAt: new Date(),
        status: 'pending'
      };

      // TODO: Send invitation email with training requirements
      
      res.json({ 
        success: true, 
        invitationId: invitation.id,
        message: "Admin invitation sent with training requirements" 
      });
    } catch (error) {
      console.error("Admin invitation error:", error);
      res.status(500).json({ error: "Failed to send invitation" });
    }
  });

  app.get("/api/admin/users", async (req, res) => {
    try {
      // Query actual admin users from database
      const adminInvites = await db.select().from(adminUsers);
      
      const adminUsersList = adminInvites.map(invite => ({
        id: invite.id,
        user: {
          email: invite.invitationEmail,
          name: invite.invitationEmail || "Unnamed Admin"
        },
        adminLevel: invite.adminLevel,
        permissions: invite.permissions || [],
        trainingStatus: invite.trainingStatus || "not_started",
        certificationLevel: invite.certificationLevel || "none",
        specializations: invite.specializations || [],
        isActive: invite.isActive ?? false,
        lastActiveAt: invite.lastActiveAt || invite.createdAt,
        invitedAt: invite.createdAt,
        status: invite.isActive ? "accepted" : "inactive"
      }));
      
      res.json(adminUsersList);
    } catch (error) {
      console.error("Error fetching admin users:", error);
      res.status(500).json({ error: "Failed to fetch admin users" });
    }
  });

  // Real platform stats for the dashboard cards (counts + gross revenue).
  app.get("/api/admin/platform-stats", async (_req, res) => {
    try {
      const s = await storage.getPlatformStats();
      res.json({
        totalUsers: s.totalUsers,
        activeBusinesses: s.activeBusinesses,
        activeCampaigns: s.activeCampaigns,
        totalRevenue: Math.round(s.totalRevenueCents / 100),
      });
    } catch (error) {
      console.error("Platform stats error:", error);
      res.status(500).json({ error: "Failed to load platform stats" });
    }
  });

  // Command center: headline KPIs + the "needs attention" queue.
  app.get("/api/admin/overview", async (_req, res) => {
    try {
      res.json(await storage.getAdminOverview());
    } catch (error) {
      console.error("Admin overview error:", error);
      res.status(500).json({ error: "Failed to load overview" });
    }
  });

  // Support 360: full picture of one user (profile + businesses + stats).
  app.get("/api/admin/user/:id/detail", async (req, res) => {
    try {
      const detail = await storage.getUserDetail(req.params.id);
      if (!detail) return res.status(404).json({ error: "User not found" });
      res.json(detail);
    } catch (error) {
      console.error("User detail error:", error);
      res.status(500).json({ error: "Failed to load user detail" });
    }
  });

  // Impersonate ("view as") a user for support. Admin-gated; refuses to
  // impersonate another admin. The real admin id is stashed in the session so
  // they can stop (POST /api/auth/stop-impersonate, which is NOT admin-gated).
  app.post("/api/admin/impersonate/:userId", async (req, res, next) => {
    try {
      const admin = req.user as any;
      const target = await storage.getUser(req.params.userId);
      if (!target) return res.status(404).json({ error: "User not found" });
      const [targetAdmin] = await db.select({ id: adminUsers.id }).from(adminUsers).where(eq(adminUsers.userId, target.id));
      if (targetAdmin) return res.status(403).json({ error: "Can't impersonate an admin" });

      const impersonatorId = admin.id;
      const impersonatorEmail = admin.email;
      req.login(target, (err) => {
        if (err) return next(err);
        (req.session as any).impersonatorId = impersonatorId;
        (req.session as any).impersonatorEmail = impersonatorEmail;
        console.warn(`[impersonate] admin ${impersonatorEmail} is now viewing as ${target.email}`);
        // Log with the admin's identity (req.user is now the target after login).
        storage.logAdminAction({ adminUserId: impersonatorId, adminEmail: impersonatorEmail, action: "user.impersonate", targetType: "user", targetId: target.id, detail: target.email });
        res.json({ success: true, user: { id: target.id, email: target.email } });
      });
    } catch (error) {
      console.error("Impersonate error:", error);
      res.status(500).json({ error: "Failed to impersonate" });
    }
  });

  // Suspend / unsuspend a user account. Refuses to suspend an admin.
  app.post("/api/admin/users/:id/suspend", async (req, res) => {
    try {
      const suspended = req.body?.suspended !== false;
      const reason = req.body?.reason ? String(req.body.reason).slice(0, 300) : null;
      const target = await storage.getUser(req.params.id);
      if (!target) return res.status(404).json({ error: "User not found" });
      const [targetAdmin] = await db.select({ id: adminUsers.id }).from(adminUsers).where(eq(adminUsers.userId, target.id));
      if (targetAdmin) return res.status(403).json({ error: "Can't suspend an admin" });
      await storage.setUserSuspended(target.id, suspended, reason);
      audit(req, suspended ? "user.suspend" : "user.unsuspend", "user", target.id, reason || target.email || undefined);
      res.json({ success: true, suspended });
    } catch (error) {
      console.error("Suspend error:", error);
      res.status(500).json({ error: "Failed to update suspension" });
    }
  });

  // Audit log — recent privileged admin actions.
  app.get("/api/admin/audit", async (_req, res) => {
    try {
      res.json(await storage.getAdminAudit(150));
    } catch (error) {
      console.error("Audit error:", error);
      res.status(500).json({ error: "Failed to load audit log" });
    }
  });

  // Customer-side health: redemption rate, repeat rate, active + top customers.
  app.get("/api/admin/customer-health", async (_req, res) => {
    try {
      res.json(await storage.getCustomerHealth());
    } catch (error) {
      console.error("Customer health error:", error);
      res.status(500).json({ error: "Failed to load customer health" });
    }
  });

  // Geographic view: business points (heatmap) + territory coverage.
  app.get("/api/admin/geo", async (_req, res) => {
    try {
      res.json(await storage.getAdminGeo());
    } catch (error) {
      console.error("Admin geo error:", error);
      res.status(500).json({ error: "Failed to load geo data" });
    }
  });

  // Retention watch: at-risk businesses (dormant / never activated / trial ending).
  app.get("/api/admin/at-risk", async (_req, res) => {
    try {
      res.json(await storage.getAtRiskBusinesses());
    } catch (error) {
      console.error("At-risk error:", error);
      res.status(500).json({ error: "Failed to load at-risk businesses" });
    }
  });

  // Insights: 6-month trends + business activation funnel.
  app.get("/api/admin/insights", async (_req, res) => {
    try {
      res.json(await storage.getAdminInsights());
    } catch (error) {
      console.error("Admin insights error:", error);
      res.status(500).json({ error: "Failed to load insights" });
    }
  });

  // Revenue tab: MRR, subscription/add-on mix, liability, trials, this month.
  app.get("/api/admin/revenue", async (_req, res) => {
    try {
      res.json(await storage.getRevenueSummary());
    } catch (error) {
      console.error("Admin revenue error:", error);
      res.status(500).json({ error: "Failed to load revenue" });
    }
  });

  // ── Trust & Safety ──────────────────────────────────────────────────────

  app.get("/api/admin/verification-queue", async (_req, res) => {
    try {
      res.json(await storage.getAdminVerificationQueue());
    } catch (error) {
      console.error("Verification queue error:", error);
      res.status(500).json({ error: "Failed to load verification queue" });
    }
  });

  // Admin verify/reject a business (platform-wide, any territory).
  app.patch("/api/admin/businesses/:id/verification", async (req, res) => {
    try {
      const status = String(req.body?.status || "");
      if (!["verified", "rejected", "unverified"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      const business = await storage.updateBusiness(req.params.id, { verificationStatus: status });
      audit(req, status === "verified" ? "business.verify" : "business.reject", "business", req.params.id, business?.name);
      res.json({ success: true, business });
    } catch (error) {
      console.error("Admin verify error:", error);
      res.status(500).json({ error: "Failed to update verification" });
    }
  });

  app.get("/api/admin/hosted-pages", async (_req, res) => {
    try {
      res.json(await storage.getAdminHostedPages());
    } catch (error) {
      console.error("Hosted pages error:", error);
      res.status(500).json({ error: "Failed to load hosted pages" });
    }
  });

  // Kill-switch: unpublish a hosted business page (moderation).
  app.post("/api/admin/businesses/:id/unpublish", async (req, res) => {
    try {
      await storage.updateBusiness(req.params.id, { websitePublished: false });
      audit(req, "page.unpublish", "business", req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Unpublish error:", error);
      res.status(500).json({ error: "Failed to unpublish page" });
    }
  });

  app.get("/api/admin/nonprofits", async (_req, res) => {
    try {
      const rows = await storage.getNonprofits();
      res.json(rows.map((b) => ({ id: b.id, name: b.name, ein: b.ein, mission: b.nonprofitMission })));
    } catch (error) {
      console.error("Nonprofits error:", error);
      res.status(500).json({ error: "Failed to load nonprofits" });
    }
  });

  // Revoke 501(c)(3) status (removes the free-plan flag).
  app.post("/api/admin/businesses/:id/revoke-nonprofit", async (req, res) => {
    try {
      await storage.updateBusiness(req.params.id, { isNonprofit: false });
      audit(req, "nonprofit.revoke", "business", req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Revoke nonprofit error:", error);
      res.status(500).json({ error: "Failed to revoke nonprofit status" });
    }
  });

  // Territories tab: coordinator leaderboard.
  app.get("/api/admin/coordinator-leaderboard", async (_req, res) => {
    try {
      res.json(await storage.getCoordinatorLeaderboard());
    } catch (error) {
      console.error("Leaderboard error:", error);
      res.status(500).json({ error: "Failed to load leaderboard" });
    }
  });

  // Platform tab: which integrations are configured (booleans only — never the
  // secret values themselves).
  app.get("/api/admin/platform-config", (_req, res) => {
    const has = (v?: string) => !!(v && v.trim());
    res.json({
      integrations: {
        database: has(process.env.DATABASE_URL),
        stripe: has(process.env.STRIPE_SECRET_KEY),
        stripeWebhook: has(process.env.STRIPE_WEBHOOK_SECRET),
        googleMaps: has(process.env.GOOGLE_MAPS_API_KEY) || has(process.env.VITE_GOOGLE_MAPS_API_KEY),
        openai: has(process.env.OPENAI_API_KEY),
      },
    });
  });

  // The built-in campaign template catalog (shared with coordinators).
  app.get("/api/admin/campaign-templates", (_req, res) => {
    res.json(
      Object.entries(CAMPAIGN_TEMPLATES).map(([key, t]) => ({
        key,
        name: t.label,
        category: t.campaign.type,
        description: t.campaign.description,
        pointsAwarded: t.campaign.pointsAwarded,
      })),
    );
  });

  // Real platform users for the user-management table.
  app.get("/api/admin/platform-users", async (_req, res) => {
    try {
      res.json(await storage.listPlatformUsers());
    } catch (error) {
      console.error("Platform users error:", error);
      res.status(500).json({ error: "Failed to load platform users" });
    }
  });

  app.get("/api/admin/invitations/pending", async (req, res) => {
    try {
      // Query actual pending invitations from database
      const pendingInvitations = await db.select()
        .from(adminUsers)
        .where(eq(adminUsers.isActive, false));
      
      res.json(pendingInvitations);
    } catch (error) {
      console.error("Error fetching pending invitations:", error);
      res.status(500).json({ error: "Failed to fetch pending invitations" });
    }
  });

  app.get("/api/admin/communications", async (req, res) => {
    try {
      // Query actual communications from database
      const communications = await db.select()
        .from(adminCommunications)
        .orderBy(desc(adminCommunications.createdAt));
      
      res.json(communications);
    } catch (error) {
      console.error("Error fetching communications:", error);
      res.status(500).json({ error: "Failed to fetch communications" });
    }
  });

  app.post("/api/admin/communications/send", async (req, res) => {
    try {
      const { recipientType, recipientId, subject, content, priority, requiresAcknowledgment } = req.body;
      
      // Insert communication into database
      const [communication] = await db.insert(adminCommunications).values({
        id: crypto.randomUUID(),
        senderId: "current_admin", // TODO: Get from authenticated session
        recipientRole: recipientType === "role" ? recipientId : null,
        recipientLevel: recipientType === "level" ? recipientId : null,
        type: "announcement",
        subject,
        content,
        priority: priority || "normal",
        requiresAcknowledgment: requiresAcknowledgment || false,
        isRead: false
      }).returning();

      res.json({ success: true, communicationId: communication.id });
    } catch (error) {
      console.error("Error sending communication:", error);
      res.status(500).json({ error: "Failed to send communication" });
    }
  });

  app.delete("/api/admin/invitations/:inviteId", async (req, res) => {
    try {
      const { inviteId } = req.params;
      
      // Delete invitation from database
      await db.delete(adminUsers)
        .where(eq(adminUsers.id, inviteId));
      
      res.json({ success: true, message: "Invitation revoked" });
    } catch (error) {
      console.error("Error revoking invitation:", error);
      res.status(500).json({ error: "Failed to revoke invitation" });
    }
  });

  app.patch("/api/admin/users/:adminId/status", async (req, res) => {
    try {
      const { adminId } = req.params;
      const { isActive } = req.body;
      
      // Update admin status in database
      await db.update(adminUsers)
        .set({ 
          isActive: isActive,
          updatedAt: new Date()
        })
        .where(eq(adminUsers.id, adminId));
      
      res.json({ success: true, message: "Admin status updated" });
    } catch (error) {
      console.error("Error updating admin status:", error);
      res.status(500).json({ error: "Failed to update admin status" });
    }
  });

  // Admin Training Center Routes - ADMIN ONLY ACCESS
  
  app.get("/api/admin/training/progress", async (req, res) => {
    try {
      // Query actual training progress from database
      const trainingProgress = await db.select()
        .from(adminTrainingProgress)
        .orderBy(desc(adminTrainingProgress.updatedAt));
      
      res.json(trainingProgress);
    } catch (error) {
      console.error("Error fetching training progress:", error);
      res.status(500).json({ error: "Failed to fetch training progress" });
    }
  });

  app.get("/api/admin/training/modules", async (req, res) => {
    try {
      // Query actual training modules from database
      const modules = await db.select()
        .from(adminTrainingModules)
        .where(eq(adminTrainingModules.isActive, true))
        .orderBy(adminTrainingModules.category, adminTrainingModules.requiredLevel);
      
      res.json(modules);
    } catch (error) {
      console.error("Error fetching training modules:", error);
      res.status(500).json({ error: "Failed to fetch training modules" });
    }
  });

  app.get("/api/admin/training/knowledge-checklist", async (req, res) => {
    try {
      // Query knowledge checklist items from database
      const knowledgeItems = await db.select()
        .from(adminKnowledgeItems)
        .where(eq(adminKnowledgeItems.isActive, true))
        .orderBy(adminKnowledgeItems.category, adminKnowledgeItems.importance);
      
      res.json(knowledgeItems);
    } catch (error) {
      console.error("Error fetching knowledge checklist:", error);
      res.status(500).json({ error: "Failed to fetch knowledge checklist" });
    }
  });

  app.post("/api/admin/training/progress", async (req, res) => {
    try {
      const { adminUserId, moduleId, status, score, answers } = req.body;
      
      // Insert or update training progress
      const progressRecord = {
        id: crypto.randomUUID(),
        adminUserId,
        moduleId,
        status,
        score,
        answers,
        timeSpent: req.body.timeSpent || 0,
        attempts: 1,
        lastAttemptAt: new Date(),
        createdAt: new Date()
      };
      
      await db.insert(adminTrainingProgress).values(progressRecord);
      
      res.json({ success: true, progressId: progressRecord.id });
    } catch (error) {
      console.error("Error updating training progress:", error);
      res.status(500).json({ error: "Failed to update training progress" });
    }
  });

  app.get("/api/admin/profile", async (req, res) => {
    try {
      // Mock admin profile data
      const profile = {
        id: "admin_1",
        certificationLevel: "basic",
        specializations: ["user_management"],
        trainingStatus: "in_progress"
      };
      res.json(profile);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch admin profile" });
    }
  });

  app.post("/api/admin/training/modules/:moduleId/start", async (req, res) => {
    try {
      const { moduleId } = req.params;
      // Mock start module logic
      res.json({ success: true, message: "Module started" });
    } catch (error) {
      res.status(500).json({ error: "Failed to start module" });
    }
  });

  app.post("/api/admin/training/modules/:moduleId/complete", async (req, res) => {
    try {
      const { moduleId } = req.params;
      const { answers } = req.body;
      
      // Mock completion logic with scoring
      const score = Math.floor(Math.random() * 30) + 70; // Random score 70-100
      const passed = score >= 80;
      
      res.json({ success: true, score, passed });
    } catch (error) {
      res.status(500).json({ error: "Failed to complete module" });
    }
  });

  app.patch("/api/admin/training/knowledge-checklist", async (req, res) => {
    try {
      const { itemId, completed } = req.body;
      // Mock checklist update
      res.json({ success: true, message: "Checklist updated" });
    } catch (error) {
      res.status(500).json({ error: "Failed to update checklist" });
    }
  });

  // CHR-32: list all coordinators (for the admin dashboard share control).
  app.get("/api/admin/coordinators", async (_req, res) => {
    try {
      res.json(await storage.listCoordinators());
    } catch (error) {
      console.error("Admin list coordinators error:", error);
      res.status(500).json({ error: "Failed to load coordinators" });
    }
  });

  // CHR-32: set a coordinator's revenue-share % — admin discretion within the
  // 50–100 band (default is 70). Applies to all future earnings; per-charge rows
  // snapshot the rate at time of charge, so past earnings are unaffected.
  app.patch("/api/admin/coordinators/:coordinatorId/share", async (req, res) => {
    try {
      const coordinator = await storage.getCoordinator(req.params.coordinatorId);
      if (!coordinator) return res.status(404).json({ error: "Coordinator not found" });
      const pct = Number(req.body?.sharePct);
      if (!Number.isInteger(pct) || pct < COORDINATOR_SHARE_MIN || pct > COORDINATOR_SHARE_MAX) {
        return res.status(400).json({
          error: `sharePct must be a whole number between ${COORDINATOR_SHARE_MIN} and ${COORDINATOR_SHARE_MAX}`,
        });
      }
      const updated = await storage.updateCoordinatorSharePct(coordinator.id, pct);
      res.json(updated);
    } catch (error) {
      console.error("Admin set coordinator share error:", error);
      res.status(500).json({ error: "Failed to update coordinator share" });
    }
  });

  // ── CHR-32 / CHR-64: coordinator payouts (reporting-only) ─────────────────
  // Admin-gated via the /api/admin prefix (isAdminAuthenticated in the root).

  // List a coordinator's payouts.
  app.get("/api/admin/coordinators/:coordinatorId/payouts", async (req, res) => {
    try {
      res.json(await storage.getCoordinatorPayouts(req.params.coordinatorId));
    } catch (error) {
      console.error("Admin list payouts error:", error);
      res.status(500).json({ error: "Failed to load payouts" });
    }
  });

  // Generate a pending payout from the coordinator's unpaid earnings (optionally
  // scoped to one ?month / body.periodMonth). 409 when nothing is unpaid.
  app.post("/api/admin/coordinators/:coordinatorId/payouts", async (req, res) => {
    try {
      const coordinator = await storage.getCoordinator(req.params.coordinatorId);
      if (!coordinator) return res.status(404).json({ error: "Coordinator not found" });
      const periodMonth =
        typeof req.body?.periodMonth === "string" ? req.body.periodMonth : undefined;
      const payout = await storage.generateCoordinatorPayout(coordinator.id, periodMonth);
      if (!payout) return res.status(409).json({ error: "No unpaid earnings to pay out" });
      res.status(201).json(payout);
    } catch (error) {
      console.error("Admin generate payout error:", error);
      res.status(500).json({ error: "Failed to generate payout" });
    }
  });

  // Mark a payout paid (or void to release its earnings).
  // TODO(CHR-32 follow-up): automated Stripe Connect path — create a Connect
  // account per coordinator + `stripe.transfers.create({ amount: totalShareCents,
  // destination: acct })`, set method='stripe_connect' and reference=transfer.id.
  app.post("/api/admin/payouts/:id/pay", async (req, res) => {
    try {
      const payout = await storage.getCoordinatorPayout(req.params.id);
      if (!payout) return res.status(404).json({ error: "Payout not found" });
      const status = req.body?.status === "void" ? "void" : "paid";
      const updated = await storage.updateCoordinatorPayout(req.params.id, {
        status,
        reference: req.body?.reference,
        notes: req.body?.notes,
      });
      res.json(updated);
    } catch (error) {
      console.error("Admin pay payout error:", error);
      res.status(500).json({ error: "Failed to update payout" });
    }
  });

  // AI-powered endpoints using OpenAI
  app.post("/api/ai/business-insights", async (req, res) => {
    try {
      const businessData = req.body;
      const insights = await openaiService.generateBusinessInsights(businessData);
      res.json({ insights });
    } catch (error) {
      console.error("Error generating business insights:", error);
      res.status(500).json({ error: "Failed to generate business insights" });
    }
  });

  app.post("/api/ai/campaign-suggestions", async (req, res) => {
    try {
      const businessContext = req.body;
      const suggestion = await openaiService.generateCampaignSuggestion(businessContext);
      res.json({ suggestion });
    } catch (error) {
      console.error("Error generating campaign suggestion:", error);
      res.status(500).json({ error: "Failed to generate campaign suggestion" });
    }
  });

  app.post("/api/ai/pricing-optimization", async (req, res) => {
    try {
      const pricingData = req.body;
      const optimizations = await openaiService.analyzePricing(pricingData);
      res.json({ optimizations });
    } catch (error) {
      console.error("Error analyzing pricing:", error);
      res.status(500).json({ error: "Failed to analyze pricing" });
    }
  });

  app.post("/api/ai/predictive-analytics", async (req, res) => {
    try {
      const historicalData = req.body;
      const analytics = await openaiService.generatePredictiveAnalytics(historicalData);
      res.json({ analytics });
    } catch (error) {
      console.error("Error generating predictive analytics:", error);
      res.status(500).json({ error: "Failed to generate predictive analytics" });
    }
  });

  app.post("/api/ai/customer-behavior", async (req, res) => {
    try {
      const customerData = req.body;
      const analysis = await openaiService.analyzeCustomerBehavior(customerData);
      res.json({ analysis });
    } catch (error) {
      console.error("Error analyzing customer behavior:", error);
      res.status(500).json({ error: "Failed to analyze customer behavior" });
    }
  });

  // Communication API routes
  app.get("/api/communication/channels", async (req, res) => {
    try {
      const channels = [
        {
          id: "testing-main",
          name: "Testing Partnership",
          type: "testing",
          participants: ["admin", "partner"],
          unreadCount: 0
        },
        {
          id: "merchants-general",
          name: "Merchant Collaboration",
          type: "group",
          participants: ["merchant1", "merchant2", "merchant3"],
          unreadCount: 2
        },
        {
          id: "campaign-winter",
          name: "Winter Campaign Planning",
          type: "campaign",
          participants: ["merchant1", "merchant2"],
          unreadCount: 1
        }
      ];
      res.json(channels);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch channels" });
    }
  });

  app.get("/api/communication/messages/:channelId", async (req, res) => {
    try {
      const { channelId } = req.params;
      const messages = [
        {
          id: "1",
          senderId: "partner",
          senderName: "Testing Partner",
          content: "Ready to start testing the platform!",
          timestamp: new Date(),
          type: "text",
          status: "read"
        }
      ];
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

}
