/**
 * Stage Task Templates Routes
 * GET    /api/legal-stage-templates          — list templates (filterable)
 * POST   /api/legal-stage-templates          — create template
 * PATCH  /api/legal-stage-templates/:id      — update template
 * DELETE /api/legal-stage-templates/:id      — soft-delete template
 */

import { Router, type Request, type Response, type NextFunction } from "express";
import { authenticate } from "../auth.js";
import { storage } from "../storage/storeage/database-storage.js";
import type { JWTPayload } from "@/shared/model.schema.js";
import { LEGAL_STAGE_CODES } from "@/shared/schema/legal-stage.schema.js";

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/legal-stage-templates?tipoProcesoId=&stageCode=
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  "/legal-stage-templates",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as JWTPayload;
      if (user.rol.nombre === "cliente") {
        res.status(403).json({ error: "Sin permiso" });
        return;
      }

      const tipoProcesoId = req.query.tipoProcesoId
        ? Number(req.query.tipoProcesoId)
        : undefined;
      const stageCode = req.query.stageCode as string | undefined;

      const templates = await storage.stageTemplates.list(tipoProcesoId, stageCode);
      res.json(templates);
    } catch (err) {
      next(err);
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/legal-stage-templates
// ─────────────────────────────────────────────────────────────────────────────

router.post(
  "/legal-stage-templates",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as JWTPayload;

      if (user.rol.nombre === "cliente") {
        res.status(403).json({ error: "Sin permiso" });
        return;
      }

      const { tipoProcesoId, legalStageCode, titulo, descripcion, prioridad, requerida, orden } =
        req.body as {
          tipoProcesoId?: number | null;
          legalStageCode?: string;
          titulo?: string;
          descripcion?: string | null;
          prioridad?: string;
          requerida?: boolean;
          orden?: number;
        };

      if (!legalStageCode || !titulo) {
        res.status(400).json({ error: "legalStageCode y titulo son requeridos" });
        return;
      }

      if (!(LEGAL_STAGE_CODES as readonly string[]).includes(legalStageCode)) {
        res.status(400).json({ error: `legalStageCode inválido: ${legalStageCode}` });
        return;
      }

      const template = await storage.stageTemplates.create({
        tipoProcesoId: tipoProcesoId ?? null,
        legalStageCode,
        titulo,
        descripcion:   descripcion ?? null,
        prioridad:     (prioridad as any) ?? "media",
        requerida:     !!requerida,
        orden:         orden ?? 0,
      });

      res.status(201).json(template);
    } catch (err) {
      next(err);
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/legal-stage-templates/:id
// ─────────────────────────────────────────────────────────────────────────────

router.patch(
  "/legal-stage-templates/:id",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as JWTPayload;

      if (user.rol.nombre === "cliente") {
        res.status(403).json({ error: "Sin permiso" });
        return;
      }

      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: "ID inválido" });
        return;
      }

      const updated = await storage.stageTemplates.update(id, req.body);
      if (!updated) {
        res.status(404).json({ error: "Plantilla no encontrada" });
        return;
      }

      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/legal-stage-templates/:id
// ─────────────────────────────────────────────────────────────────────────────

router.delete(
  "/legal-stage-templates/:id",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as JWTPayload;

      if (user.rol.nombre === "cliente") {
        res.status(403).json({ error: "Sin permiso" });
        return;
      }

      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: "ID inválido" });
        return;
      }

      await storage.stageTemplates.delete(id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

export default router;
