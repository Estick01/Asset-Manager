/**
 * Community Routes
 */
import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { authenticate, authenticateOptional } from "../auth.js";
import { requireFeature } from "../middleware/require-feature.js";
import { communityService } from "../services/community.service.js";
import { matchingService } from "../services/matching.service.js";
import { storage } from "../storage/storeage/database-storage.js";
import { rateLimit } from "../middleware/rate-limit.js";

// Max 10 writes per minute per IP
const writeLimiter = rateLimit({ windowMs: 60_000, maxRequests: 10,
  message: "Demasiadas solicitudes. Intenta de nuevo en un minuto." });

/** Safely extract a single string from req.params or req.query */
const str = (v: string | string[] | undefined): string => (Array.isArray(v) ? v[0] : v) ?? "";

const router = Router();

// ── Schemas ────────────────────────────────────────────────────────────────

const createPostSchema = z.object({
  title:      z.string().min(3).max(255),
  content:    z.string().min(1).max(50_000),
  visibility: z.enum(["public", "anonymous"]).optional().default("public"),
  tagIds:     z.array(z.string()).max(10).optional().default([]),
  caseType:   z.string().max(50).nullable().optional(),
  isUrgent:   z.boolean().optional().default(false),
  city:       z.string().max(100).nullable().optional(),
});

const updatePostSchema = z.object({
  title:    z.string().min(3).max(255).optional(),
  content:  z.string().min(1).max(50_000).optional(),
  tagIds:   z.array(z.string()).max(10).optional(),
  caseType: z.string().max(50).nullable().optional(),
  isUrgent: z.boolean().optional(),
  city:     z.string().max(100).nullable().optional(),
});

const createCommentSchema = z.object({
  content:  z.string().min(1).max(5_000),
  parentId: z.string().nullable().optional(),
});

const reportSchema = z.object({
  reason: z.string().min(1).max(50),
  detail: z.string().max(500).optional(),
});

// ── GET /api/tags ──────────────────────────────────────────────────────────
router.get("/tags", async (_req, res, next) => {
  try {
    res.json(await communityService.getTags());
  } catch (e) { next(e); }
});

// ── GET /api/posts ─────────────────────────────────────────────────────────
router.get("/posts", authenticateOptional, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit  as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const filter = {
      search:         req.query.search         as string | undefined,
      tagSlug:        req.query.tag            as string | undefined,
      sort:           req.query.sort           as "recent" | "popular" | "liked" | undefined,
      city:           req.query.city           as string | undefined,
      authorId:       req.query.authorId       as string | undefined,
      unlinkedOnly:   req.query.unlinkedOnly   === "true",
      clientAccepted: req.query.clientAccepted === "true",
    };
    const userId = (req as any).user?.id as string | undefined;
    res.json(await communityService.getPosts(limit, offset, filter, userId));
  } catch (e) { next(e); }
});

// ── GET /api/posts/:id ─────────────────────────────────────────────────────
router.get("/posts/:id", authenticateOptional, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id as string | undefined;
    // Increment view (fire-and-forget)
    communityService.incrementView(str(req.params.id), userId).catch(() => {});
    const post = await communityService.getPost(str(req.params.id), userId);
    if (!post) return res.status(404).json({ error: "Post no encontrado" });
    res.json(post);
  } catch (e) { next(e); }
});

// ── POST /api/posts ────────────────────────────────────────────────────────
router.post("/posts", authenticate, requireFeature("comunidad"), writeLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createPostSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });
    res.status(201).json(await communityService.createPost(req.user!.id, parsed.data));
  } catch (e) { next(e); }
});

// ── PUT /api/posts/:id ─────────────────────────────────────────────────────
router.put("/posts/:id", authenticate, requireFeature("comunidad"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = updatePostSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });
    res.json(await communityService.updatePost(str(req.params.id), req.user!.id, parsed.data));
  } catch (e) { next(e); }
});

// ── DELETE /api/posts/:id ──────────────────────────────────────────────────
router.delete("/posts/:id", authenticate, requireFeature("comunidad"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await communityService.deletePost(str(req.params.id), req.user!.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ── GET /api/posts/:id/comments ────────────────────────────────────────────
router.get("/posts/:id/comments", async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await communityService.getComments(str(req.params.id)));
  } catch (e: any) {
    if (e?.message === "Post no encontrado") return res.status(404).json({ error: e.message });
    next(e);
  }
});

// ── POST /api/posts/:id/comments ───────────────────────────────────────────
router.post("/posts/:id/comments", authenticate, requireFeature("comunidad"), writeLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createCommentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });
    const comment = await communityService.addComment(str(req.params.id), req.user!.id, parsed.data.content, parsed.data.parentId);
    res.status(201).json(comment);
  } catch (e: any) {
    if (e?.message === "Post no encontrado") return res.status(404).json({ error: e.message });
    if (e?.message === "Comentario padre inválido") return res.status(400).json({ error: e.message });
    next(e);
  }
});

// ── PUT /api/comments/:id ──────────────────────────────────────────────────
const updateCommentSchema = z.object({
  content: z.string().min(1).max(5_000),
});

router.put("/comments/:id", authenticate, requireFeature("comunidad"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = updateCommentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });
    await communityService.updateComment(str(req.params.id), req.user!.id, parsed.data.content);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ── DELETE /api/comments/:id ───────────────────────────────────────────────
router.delete("/comments/:id", authenticate, requireFeature("comunidad"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await communityService.deleteComment(str(req.params.id), req.user!.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ── POST /api/posts/:id/like ───────────────────────────────────────────────
router.post("/posts/:id/like", authenticate, requireFeature("comunidad"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await communityService.toggleLike(str(req.params.id), req.user!.id));
  } catch (e) { next(e); }
});

// ── POST /api/posts/:id/bookmark ──────────────────────────────────────────
router.post("/posts/:id/bookmark", authenticate, requireFeature("comunidad"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await communityService.toggleBookmark(str(req.params.id), req.user!.id));
  } catch (e) { next(e); }
});

// ── GET /api/bookmarks ────────────────────────────────────────────────────
router.get("/bookmarks", authenticate, requireFeature("comunidad"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await communityService.getBookmarks(req.user!.id));
  } catch (e) { next(e); }
});

// ── POST /api/posts/:id/report ────────────────────────────────────────────
router.post("/posts/:id/report", authenticate, requireFeature("comunidad"), writeLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = reportSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });
    await communityService.reportPost(str(req.params.id), req.user!.id, parsed.data.reason, parsed.data.detail);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ── POST /api/comments/:id/report ────────────────────────────────────────
router.post("/comments/:id/report", authenticate, requireFeature("comunidad"), writeLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = reportSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });
    await communityService.reportComment(str(req.params.id), req.user!.id, parsed.data.reason, parsed.data.detail);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ── POST /api/posts/:id/start-chat ────────────────────────────────────────
router.post("/posts/:id/start-chat", authenticate, requireFeature("comunidad"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await communityService.startChat(str(req.params.id), req.user!.id));
  } catch (e: any) {
    if (e?.message === "Post no encontrado" || e?.message === "No puedes iniciar un chat contigo mismo") {
      return res.status(400).json({ error: e.message });
    }
    next(e);
  }
});

// ── GET /api/community/recommended-lawyers?postId=xxx ─────────────────────
// Returns top 8 lawyers scored by specialization match + rating for a post.
// Public (optional auth) — clients use this to find who can help them.
router.get("/community/recommended-lawyers", authenticateOptional, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const postId = str(req.query.postId as string | string[] | undefined);
    if (!postId) return res.status(400).json({ error: "postId requerido" });

    const post = await storage.community.getPost(postId);
    if (!post) return res.status(404).json({ error: "Post no encontrado" });

    // No recommendations for taken/closed cases
    if (post.status !== "open") return res.json([]);

    const lawyers = await storage.recommendations.getRecommendedLawyers(
      post.caseType,
      post.city,
      8,
    );

    // Enrich each lawyer with community badges (parallel, silent failures)
    const enriched = await Promise.all(
      lawyers.map(async (l) => {
        const stats = await storage.community.getLawyerCommunityStats(l.userId).catch(() => null);
        return { ...l, badges: stats?.badges ?? [] };
      })
    );
    res.json(enriched);
  } catch (e) { next(e); }
});

// ── GET /api/community/lawyer-feed ────────────────────────────────────────
// Returns personalised case feed for the authenticated lawyer/firm user.
// Sections: urgent | recommended | recent — ordered by urgency + match score.
router.get("/community/lawyer-feed", authenticate, requireFeature("comunidad"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    // Resolve lawyer profile ID from userId
    const lawyerProfile = await storage.abogados.getLawyerByUserId(userId);
    if (!lawyerProfile) {
      return res.status(403).json({ error: "Solo abogados pueden acceder a este feed" });
    }

    const limit  = Math.min(parseInt(str(req.query.limit  as string | string[] | undefined)) || 60, 200);
    const offset = parseInt(str(req.query.offset as string | string[] | undefined)) || 0;

    // Expire stale takes before building the feed
    communityService.runExpiry().catch(() => {});
    const feed = await matchingService.getLawyerFeed(lawyerProfile.id, userId, limit, offset);
    res.json(feed);
  } catch (e) { next(e); }
});

// ── POST /api/community/posts/:id/seen ────────────────────────────────────
// Marks a matched post as "seen" in the lawyer's feed.
router.post("/posts/:id/seen", authenticate, requireFeature("comunidad"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const lawyerProfile = await storage.abogados.getLawyerByUserId(userId);
    if (!lawyerProfile) return res.json({ ok: true }); // silent for non-lawyers
    await matchingService.markSeen(str(req.params.id), lawyerProfile.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ── POST /api/posts/:id/take ───────────────────────────────────────────────
// Lawyer claims an open post. Returns updated PostDTO.
router.post("/posts/:id/take", authenticate, requireFeature("comunidad"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId       = req.user!.id;
    const lawyerProfile = await storage.abogados.getLawyerByUserId(userId);
    if (!lawyerProfile) {
      return res.status(403).json({ error: "Solo abogados pueden tomar casos" });
    }
    if (lawyerProfile.professionalVerificationStatus !== "verificado") {
      return res.status(403).json({
        error: "Debes tener tu tarjeta profesional verificada para tomar casos de comunidad.",
        code: "LAWYER_PROFESSIONAL_VERIFICATION_REQUIRED",
      });
    }
    const user       = await storage.users.getUserById(userId);
    const lawyerName = user?.name ?? "Abogado";
    const post = await communityService.takePost(str(req.params.id), lawyerProfile.id, userId, lawyerName);
    res.json(post);
  } catch (e: any) {
    if (e?.status === 409) return res.status(409).json({ error: e.message });
    if (e?.status === 404) return res.status(404).json({ error: e.message });
    next(e);
  }
});

// ── POST /api/posts/:id/accept-take ───────────────────────────────────────
// Client accepts the lawyer who took their post.
router.post("/posts/:id/accept-take", authenticate, requireFeature("comunidad"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Lazy expiry check on every interaction
    communityService.runExpiry().catch(() => {});
    const post = await communityService.acceptTake(str(req.params.id), req.user!.id);
    res.json(post);
  } catch (e: any) {
    if (e?.status === 409) return res.status(409).json({ error: e.message });
    if (e?.status === 403) return res.status(403).json({ error: e.message });
    if (e?.status === 404) return res.status(404).json({ error: e.message });
    next(e);
  }
});

// ── POST /api/posts/:id/reject-take ───────────────────────────────────────
// Client rejects the lawyer — post reopens for other lawyers.
router.post("/posts/:id/reject-take", authenticate, requireFeature("comunidad"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    communityService.runExpiry().catch(() => {});
    const post = await communityService.rejectTake(str(req.params.id), req.user!.id);
    res.json(post);
  } catch (e: any) {
    if (e?.status === 409) return res.status(409).json({ error: e.message });
    if (e?.status === 403) return res.status(403).json({ error: e.message });
    if (e?.status === 404) return res.status(404).json({ error: e.message });
    next(e);
  }
});

// ── POST /api/posts/:id/close ──────────────────────────────────────────────
// Post author marks their case as resolved.
router.post("/posts/:id/close", authenticate, requireFeature("comunidad"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const post = await communityService.closePost(str(req.params.id), req.user!.id);
    res.json(post);
  } catch (e: any) {
    if (e?.status === 403) return res.status(403).json({ error: e.message });
    if (e?.status === 404) return res.status(404).json({ error: e.message });
    next(e);
  }
});

// ── GET /api/community/users/:userId/profile ──────────────────────────────
router.get("/community/users/:userId/profile", authenticateOptional, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const viewerUserId = (req as any).user?.id as string | undefined;
    const profile = await communityService.getUserProfile(str(req.params.userId), viewerUserId);
    if (!profile) return res.status(404).json({ error: "Usuario no encontrado" });
    res.json(profile);
  } catch (e) { next(e); }
});

// ── GET /api/community/lawyer-stats/:userId ────────────────────────────────
// Returns community stats + badges for a lawyer profile.
router.get("/community/lawyer-stats/:userId", authenticateOptional, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = str(req.params.userId);
    const stats = await storage.community.getLawyerCommunityStats(userId);
    res.json(stats);
  } catch (e) { next(e); }
});

export default router;
