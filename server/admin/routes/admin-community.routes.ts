import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { sql, desc, like, or, eq, and } from "drizzle-orm";
import { authenticate } from "../../auth.js";
import { requireAdmin, requireAdminRole } from "../middleware/require-admin.js";
import { storage } from "../../storage/storeage/database-storage.js";
import { posts, postReports, users } from "@/shared/schema";

const router = Router();

router.use(authenticate, requireAdmin);

router.get("/overview", requireAdminRole("admin_super", "admin_soporte"), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const db = (storage as any).db;
    const [postTotals, reportTotals] = await Promise.all([
      db.select({
        total: sql<number>`COUNT(*)`,
        open: sql<number>`SUM(CASE WHEN ${posts.status} = 'open' THEN 1 ELSE 0 END)`,
        inProgress: sql<number>`SUM(CASE WHEN ${posts.status} = 'in_progress' THEN 1 ELSE 0 END)`,
        closed: sql<number>`SUM(CASE WHEN ${posts.status} = 'closed' THEN 1 ELSE 0 END)`,
        disabled: sql<number>`SUM(CASE WHEN ${posts.disabled} = 1 THEN 1 ELSE 0 END)`,
      }).from(posts),
      db.select({ total: sql<number>`COUNT(*)` }).from(postReports),
    ]);

    res.json({
      success: true,
      data: {
        posts: {
          total: Number(postTotals[0]?.total ?? 0),
          open: Number(postTotals[0]?.open ?? 0),
          inProgress: Number(postTotals[0]?.inProgress ?? 0),
          closed: Number(postTotals[0]?.closed ?? 0),
          disabled: Number(postTotals[0]?.disabled ?? 0),
        },
        reports: Number(reportTotals[0]?.total ?? 0),
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get("/posts", requireAdminRole("admin_super", "admin_soporte"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = (storage as any).db;
    const page = Math.max(Number(req.query.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(req.query.limit ?? 20), 1), 100);
    const offset = (page - 1) * limit;
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const disabled = typeof req.query.disabled === "string" ? req.query.disabled : undefined;
    const search = typeof req.query.search === "string" ? `%${req.query.search}%` : undefined;
    const conditions = [];
    if (status) conditions.push(eq(posts.status, status as any));
    if (disabled === "true") conditions.push(eq(posts.disabled, true));
    if (disabled === "false") conditions.push(eq(posts.disabled, false));
    if (search) conditions.push(or(like(posts.title, search), like(posts.content, search), like(users.name, search))!);
    const where = conditions.length ? and(...conditions) : undefined;

    const [rows, countRows] = await Promise.all([
      db.select({
        id: posts.id,
        title: posts.title,
        status: posts.status,
        disabled: posts.disabled,
        visibility: posts.visibility,
        city: posts.city,
        createdAt: posts.createdAt,
        authorName: users.name,
        reportCount: sql<number>`(
          SELECT COUNT(*)
          FROM post_reports pr
          WHERE pr.post_id = ${posts.id}
        )`,
      })
        .from(posts)
        .leftJoin(users, eq(users.id, posts.userId))
        .where(where)
        .orderBy(desc(posts.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: sql<string>`COUNT(*)` })
        .from(posts)
        .leftJoin(users, eq(users.id, posts.userId))
        .where(where),
    ]);

    res.json({ success: true, data: rows, meta: { total: Number(countRows[0]?.total ?? 0), page, limit } });
  } catch (err) {
    next(err);
  }
});

router.get("/reports", requireAdminRole("admin_super", "admin_soporte"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = (storage as any).db;
    const limit = Math.min(Math.max(Number(req.query.limit ?? 20), 1), 100);
    const rows = await db.select({
      id: postReports.id,
      postId: postReports.postId,
      commentId: postReports.commentId,
      reason: postReports.reason,
      detail: postReports.detail,
      createdAt: postReports.createdAt,
      reporterEmail: users.email,
      reporterName: users.name,
    })
      .from(postReports)
      .leftJoin(users, eq(users.id, postReports.reporterUserId))
      .orderBy(desc(postReports.createdAt))
      .limit(limit);

    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

router.patch("/posts/:id/status", requireAdminRole("admin_super", "admin_soporte"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = z.object({ status: z.enum(["open", "in_progress", "closed"]) }).parse(req.body);
    await (storage as any).db.update(posts).set({ status }).where(eq(posts.id, req.params.id));
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.patch("/posts/:id/disabled", requireAdminRole("admin_super", "admin_soporte"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { disabled } = z.object({ disabled: z.boolean() }).parse(req.body);
    await storage.community.setPostDisabled(req.params.id, disabled);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
