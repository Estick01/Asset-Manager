/**
 * Ratings & Community Profile Routes
 *
 *  GET  /api/community/users/:userId/profile   - public profile + posts
 *  GET  /api/ratings/:targetType/:targetUserId  - list ratings for a target
 *  GET  /api/ratings/:targetType/:targetUserId/summary - avg + count
 *  GET  /api/ratings/:targetType/:targetUserId/can-rate - can current user rate?
 *  POST /api/ratings                           - create a rating (auth required)
 */

import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { authenticate } from "../auth.js";
import { ratingService } from "../services/rating.service.js";

const router = Router();

const TARGET_TYPES = ["lawyer", "firm"] as const;

const createRatingSchema = z.object({
  targetUserId: z.string().uuid(),
  targetType:   z.enum(["lawyer", "firm"]),
  score:        z.number().int().min(1).max(5),
  comment:      z.string().max(1000).nullable().optional(),
});

// ---------------------------------------------------------------------------
// GET /api/community/users/:userId/profile
// ---------------------------------------------------------------------------
router.get(
  "/community/users/:userId/profile",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profile = await ratingService.getProfile(req.params.userId);
      if (!profile) return res.status(404).json({ error: "Usuario no encontrado" });
      res.json(profile);
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/ratings/:targetType/:targetUserId
// ---------------------------------------------------------------------------
router.get(
  "/ratings/:targetType/:targetUserId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { targetType, targetUserId } = req.params;
      if (!TARGET_TYPES.includes(targetType as any)) {
        return res.status(400).json({ error: "targetType inválido" });
      }
      const list = await ratingService.getRatings(targetUserId, targetType as "lawyer" | "firm");
      res.json(list);
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/ratings/:targetType/:targetUserId/summary
// ---------------------------------------------------------------------------
router.get(
  "/ratings/:targetType/:targetUserId/summary",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { targetType, targetUserId } = req.params;
      if (!TARGET_TYPES.includes(targetType as any)) {
        return res.status(400).json({ error: "targetType inválido" });
      }
      const summary = await ratingService.getRatingSummary(targetUserId, targetType as "lawyer" | "firm");
      res.json(summary);
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/ratings/:targetType/:targetUserId/can-rate  (auth required)
// ---------------------------------------------------------------------------
router.get(
  "/ratings/:targetType/:targetUserId/can-rate",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { targetType, targetUserId } = req.params;
      if (!TARGET_TYPES.includes(targetType as any)) {
        return res.status(400).json({ error: "targetType inválido" });
      }
      const type = targetType as "lawyer" | "firm";
      const [canRate, hasRated] = await Promise.all([
        ratingService.canRate(req.user!.id, targetUserId, type),
        ratingService.hasRated(req.user!.id, targetUserId, type),
      ]);
      res.json({ canRate, hasRated });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/ratings  (auth required)
// ---------------------------------------------------------------------------
router.post(
  "/ratings",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = createRatingSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }
      const { targetUserId, targetType, score, comment } = parsed.data;
      const rating = await ratingService.createRating(
        req.user!.id, targetUserId, targetType, score, comment ?? null
      );
      res.status(201).json(rating);
    } catch (err: any) {
      const clientErrors = [
        "La calificación debe estar entre 1 y 5",
        "No puedes calificarte a ti mismo",
        "Solo puedes calificar si tienes un proceso finalizado con este usuario",
        "Ya has calificado a este usuario",
      ];
      if (clientErrors.includes(err?.message)) {
        return res.status(400).json({ error: err.message });
      }
      // Captura race condition: dos requests simultáneos pasan el check en memoria
      // pero la constraint UNIQUE de la BD rechaza el segundo insert
      if (err?.code === "ER_DUP_ENTRY" || err?.message?.includes("Duplicate entry")) {
        return res.status(400).json({ error: "Ya has calificado a este usuario" });
      }
      next(err);
    }
  }
);

export default router;
