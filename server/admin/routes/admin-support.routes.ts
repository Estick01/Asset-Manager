import { Router, type Request, type Response, type NextFunction } from "express";
import { desc, sql, like, or, eq, and } from "drizzle-orm";
import { authenticate } from "../../auth.js";
import { requireAdmin, requireAdminRole } from "../middleware/require-admin.js";
import { storage } from "../../storage/storeage/database-storage.js";
import { publicSupportRequests, securityEvents, users } from "@/shared/schema";
import { chatService } from "../../services/chat.service.js";
import { auditService } from "../services/audit.service.js";
import { sendSupportReplyEmail } from "../../services/email.service.js";

const router = Router();

router.use(authenticate, requireAdmin);

router.get("/overview", requireAdminRole("admin_super", "admin_soporte"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = (storage as any).db;
    const adminId = (req as any).user?.id as string;
    const [events, usersSummary, audit, supportConversations, publicRequestSummary] = await Promise.all([
      db.select({
        total: sql<number>`COUNT(*)`,
        loginFail: sql<number>`SUM(CASE WHEN ${securityEvents.eventType} = 'login_fail' THEN 1 ELSE 0 END)`,
        blocked: sql<number>`SUM(CASE WHEN ${securityEvents.eventType} IN ('login_blocked', 'login_blocked_user') THEN 1 ELSE 0 END)`,
      }).from(securityEvents),
      db.select({
        activos: sql<number>`SUM(CASE WHEN ${users.isActive} = 1 THEN 1 ELSE 0 END)`,
        suspendidos: sql<number>`SUM(CASE WHEN ${users.isActive} = 0 THEN 1 ELSE 0 END)`,
      }).from(users),
      storage.adminAudit.getLog({ page: 1, limit: 10 }),
      chatService.getConversations(adminId, 5, 0, "admin_support"),
      db.select({
        total: sql<number>`COUNT(*)`,
        pending: sql<number>`SUM(CASE WHEN ${publicSupportRequests.status} IN ('new', 'in_progress') THEN 1 ELSE 0 END)`,
      }).from(publicSupportRequests),
    ]);

    res.json({
      success: true,
      data: {
        security: {
          total: Number(events[0]?.total ?? 0),
          loginFail: Number(events[0]?.loginFail ?? 0),
          blocked: Number(events[0]?.blocked ?? 0),
        },
        users: {
          activos: Number(usersSummary[0]?.activos ?? 0),
          suspendidos: Number(usersSummary[0]?.suspendidos ?? 0),
        },
        support: {
          total: supportConversations.total,
          open: supportConversations.conversations.filter((conversation) => conversation.unreadCount > 0).length,
          publicRequests: Number(publicRequestSummary[0]?.total ?? 0),
          publicPending: Number(publicRequestSummary[0]?.pending ?? 0),
        },
        audit: audit.data,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get("/security-events", requireAdminRole("admin_super", "admin_soporte"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = (storage as any).db;
    const page = Math.max(Number(req.query.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(req.query.limit ?? 20), 1), 100);
    const offset = (page - 1) * limit;
    const search = typeof req.query.search === "string" ? `%${req.query.search}%` : undefined;
    const where = search ? or(like(securityEvents.email, search), like(securityEvents.ip, search)) : undefined;

    const [rows, countRows] = await Promise.all([
      db.select().from(securityEvents).where(where).orderBy(desc(securityEvents.createdAt)).limit(limit).offset(offset),
      db.select({ total: sql<string>`COUNT(*)` }).from(securityEvents).where(where),
    ]);

    res.json({ success: true, data: rows, meta: { total: Number(countRows[0]?.total ?? 0), page, limit } });
  } catch (err) {
    next(err);
  }
});

router.get("/audit-log", requireAdminRole("admin_super", "admin_soporte"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const data = await storage.adminAudit.getLog({ page, limit });
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
});

router.get("/conversations", requireAdminRole("admin_super", "admin_soporte"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const adminId = (req as any).user?.id as string;
    const limit = Math.min(Math.max(Number(req.query.limit ?? 20), 1), 100);
    const offset = Math.max(Number(req.query.offset ?? 0), 0);
    const search = typeof req.query.search === "string" ? req.query.search.trim().toLowerCase() : "";

    const result = await chatService.getConversations(adminId, limit, offset, "admin_support");
    const data = search
      ? result.conversations.filter((conversation) =>
          (conversation.name ?? "").toLowerCase().includes(search) ||
          conversation.participants.some((participant) =>
            participant.userId !== adminId &&
            `${participant.name} ${participant.email}`.toLowerCase().includes(search)
          )
        )
      : result.conversations;

    res.json({ success: true, data, meta: { total: search ? data.length : result.total, limit, offset } });
  } catch (err) {
    next(err);
  }
});

router.get("/public-requests", requireAdminRole("admin_super", "admin_soporte"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = (storage as any).db;
    const limit = Math.min(Math.max(Number(req.query.limit ?? 20), 1), 100);
    const offset = Math.max(Number(req.query.offset ?? 0), 0);
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const status = typeof req.query.status === "string" ? req.query.status.trim() : "";
    const searchTerm = search ? `%${search}%` : undefined;
    const filters = and(
      status ? eq(publicSupportRequests.status, status as any) : undefined,
      searchTerm ? or(
        like(publicSupportRequests.name, searchTerm),
        like(publicSupportRequests.email, searchTerm),
        like(publicSupportRequests.message, searchTerm),
      ) : undefined,
    );

    const [rows, totalRows] = await Promise.all([
      db.select().from(publicSupportRequests).where(filters).orderBy(desc(publicSupportRequests.createdAt)).limit(limit).offset(offset),
      db.select({ total: sql<number>`COUNT(*)` }).from(publicSupportRequests).where(filters),
    ]);

    res.json({
      success: true,
      data: rows,
      meta: {
        total: Number(totalRows[0]?.total ?? 0),
        limit,
        offset,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.patch("/public-requests/:id", requireAdminRole("admin_super", "admin_soporte"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = (storage as any).db;
    const adminId = (req as any).user?.id as string;
    const id = req.params.id;
    const status = typeof req.body?.status === "string" ? req.body.status : "";

    if (!["new", "in_progress", "resolved", "spam"].includes(status)) {
      return res.status(400).json({ error: "status inválido" });
    }

    await db.update(publicSupportRequests)
      .set({
        status: status as any,
        assignedAdminId: adminId,
        resolvedAt: status === "resolved" ? new Date() : null,
      })
      .where(eq(publicSupportRequests.id, id));

    await auditService.log({
      adminId,
      accion: "public_support_request_updated",
      targetId: id,
      detalle: `Estado actualizado a ${status}`,
    });

    const updated = await db.query.publicSupportRequests.findFirst({
      where: eq(publicSupportRequests.id, id),
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

router.post("/public-requests/:id/open-conversation", requireAdminRole("admin_super", "admin_soporte"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = (storage as any).db;
    const adminId = (req as any).user?.id as string;
    const id = req.params.id;

    const requestRow = await db.query.publicSupportRequests.findFirst({
      where: eq(publicSupportRequests.id, id),
    });

    if (!requestRow) {
      return res.status(404).json({ error: "Solicitud no encontrada" });
    }

    if (!requestRow.userId) {
      return res.status(400).json({ error: "La solicitud no está vinculada a un usuario registrado" });
    }

    const conversation = await chatService.getOrCreateSupportConversationForAdmin(adminId, requestRow.userId);

    await db.update(publicSupportRequests)
      .set({
        conversationId: conversation.id,
        assignedAdminId: adminId,
        status: "in_progress",
      })
      .where(eq(publicSupportRequests.id, id));

    await auditService.log({
      adminId,
      accion: "public_support_request_opened",
      targetId: id,
      detalle: `Conversación ${conversation.id}`,
    });

    res.status(201).json({ success: true, data: conversation });
  } catch (err) {
    next(err);
  }
});

router.post("/public-requests/:id/reply", requireAdminRole("admin_super", "admin_soporte"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = (storage as any).db;
    const adminId = (req as any).user?.id as string;
    const id = req.params.id;
    const subject = typeof req.body?.subject === "string" ? req.body.subject.trim() : "";
    const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
    const markAsResolved = req.body?.markAsResolved === true;

    if (!subject || !message) {
      return res.status(400).json({ error: "subject y message son requeridos" });
    }

    const requestRow = await db.query.publicSupportRequests.findFirst({
      where: eq(publicSupportRequests.id, id),
    });

    if (!requestRow) {
      return res.status(404).json({ error: "Solicitud no encontrada" });
    }

    await sendSupportReplyEmail(requestRow.email, subject, message);

    await db.update(publicSupportRequests)
      .set({
        assignedAdminId: adminId,
        status: markAsResolved ? "resolved" : "in_progress",
        resolvedAt: markAsResolved ? new Date() : null,
      })
      .where(eq(publicSupportRequests.id, id));

    await auditService.log({
      adminId,
      accion: "public_support_request_replied",
      targetId: id,
      detalle: `Respuesta enviada a ${requestRow.email} con asunto: ${subject}`,
    });

    const updated = await db.query.publicSupportRequests.findFirst({
      where: eq(publicSupportRequests.id, id),
    });

    res.status(201).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

router.post("/conversations", requireAdminRole("admin_super", "admin_soporte"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const adminId = (req as any).user?.id as string;
    const targetUserId = typeof req.body?.targetUserId === "string" ? req.body.targetUserId : "";
    if (!targetUserId) {
      return res.status(400).json({ error: "targetUserId es requerido" });
    }

    const conversation = await chatService.getOrCreateSupportConversationForAdmin(adminId, targetUserId);

    await auditService.log({
      adminId,
      accion: "support_chat_opened",
      targetId: targetUserId,
      detalle: `Conversación de soporte ${conversation.id}`,
    });

    res.status(201).json({ success: true, data: conversation });
  } catch (err) {
    next(err);
  }
});

export default router;
