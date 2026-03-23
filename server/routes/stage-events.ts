/**
 * Stage Events Routes
 * GET  /api/procesos/:procesoId/stage-events?stage=FILED  — timeline por etapa
 * POST /api/procesos/:procesoId/stage-events               — insertar nota manual
 */

import { Router, type Request, type Response, type NextFunction } from "express";
import { authenticate } from "../auth.js";
import { storage } from "../storage/storeage/database-storage.js";
import type { JWTPayload } from "@/shared/model.schema.js";

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/procesos/:procesoId/stage-events?stage=FILED
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  "/procesos/:procesoId/stage-events",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user      = req.user as JWTPayload;
      const rol       = user.rol.nombre;
      const idProfile = user.idProfile;
      const procesoId = req.params.procesoId;
      const stage     = req.query.stage as string | undefined;

      if (!stage) {
        res.status(400).json({ error: "Parámetro stage es requerido" });
        return;
      }

      if (!idProfile) {
        res.status(400).json({ error: "idProfile requerido" });
        return;
      }

      // Verify the authenticated user has access to this proceso
      let proceso: any = null;
      switch (rol) {
        case "abogado":
          proceso = await storage.getProceoByAbogadoIdAndProcesoId(idProfile, procesoId);
          break;
        case "bufete":
        case "corporacion":
          proceso = await storage.getProcesoByFirmaIdAndProcesoId(idProfile, procesoId);
          break;
        case "cliente":
          proceso = await storage.getProcesoByClienteIdAndProcesoId(idProfile, procesoId);
          if (proceso && proceso.clienteId !== idProfile) proceso = null;
          break;
        default:
          res.status(403).json({ error: "Rol no autorizado" });
          return;
      }

      if (!proceso) {
        res.status(404).json({ error: "Proceso no encontrado o sin acceso" });
        return;
      }

      const events = await storage.stageEvents.getByStage(procesoId, stage);
      res.json(events);
    } catch (err) {
      next(err);
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/procesos/:procesoId/stage-events  (notas manuales)
// ─────────────────────────────────────────────────────────────────────────────

router.post(
  "/procesos/:procesoId/stage-events",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user      = req.user as JWTPayload;
      const procesoId = req.params.procesoId;

      const { legalStageCode, descripcion } = req.body as {
        legalStageCode?: string;
        descripcion?:    string;
      };

      if (!legalStageCode || !descripcion?.trim()) {
        res.status(400).json({ error: "legalStageCode y descripcion son requeridos" });
        return;
      }

      const event = await storage.stageEvents.insert({
        procesoId,
        legalStageCode,
        tipo:        "nota",
        descripcion: descripcion.trim(),
        creadoPor:   user.idProfile ?? null,
      });

      res.status(201).json(event);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
