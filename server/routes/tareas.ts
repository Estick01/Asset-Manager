import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { authenticate } from "../auth.js";
import { tareaService } from "../services/tarea.service.js";
import { validate } from "../middleware/validation.js";
import type { JWTPayload } from "@/shared/model.schema.js";
import { storage } from "../storage/storeage/database-storage.js";

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// Validation schemas
// ─────────────────────────────────────────────────────────────────────────────

const createTareaSchema = z.object({
  titulo: z.string().min(1, "El título es requerido").max(255),
  descripcion: z.string().nullable().optional(),
  prioridad: z.enum(["baja", "media", "alta", "urgente"]).optional(),
  fechaLimite: z.string().nullable().optional(),
  asignadoA: z.string().uuid("ID de abogado inválido").nullable().optional(),
  legalStage: z.string().max(50).nullable().optional(),
  requerida: z.boolean().optional(),
});

const updateTareaSchema = z.object({
  titulo: z.string().min(1).max(255).optional(),
  descripcion: z.string().nullable().optional(),
  prioridad: z.enum(["baja", "media", "alta", "urgente"]).optional(),
  fechaLimite: z.string().nullable().optional(),
  asignadoA: z.string().uuid("ID de abogado inválido").nullable().optional(),
  legalStage: z.string().max(50).nullable().optional(),
  requerida: z.boolean().optional(),
});

const cambiarEstadoSchema = z.object({
  estado: z.enum(["pendiente", "en_progreso", "completada", "cancelada"]),
});

// ─────────────────────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────────────────────

function userId(req: Request): string {
  return (req.user as JWTPayload).id;
}

// ─────────────────────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/procesos/:procesoId/tareas
 * Create a task in a process
 */
router.post(
  "/procesos/:procesoId/tareas",
  authenticate,
  validate(createTareaSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const procesoId = req.params.procesoId;
      if (!procesoId || typeof procesoId !== "string") {
        return res.status(400).json({ error: "procesoId is required" });
      }

      // Verificar ownership del proceso
      const user      = req.user as JWTPayload;
      const rol       = user.rol.nombre;
      const idProfile = user.idProfile;
      if (!idProfile) return res.status(400).json({ error: "idProfile requerido" });

      let proceso: any = null;
      if (rol === "abogado")             proceso = await storage.getProceoByAbogadoIdAndProcesoId(idProfile, procesoId);
      else if (rol === "bufete" || rol === "corporacion") proceso = await storage.getProcesoByFirmaIdAndProcesoId(idProfile, procesoId);
      if (!proceso) return res.status(403).json({ error: "Sin acceso al proceso" });

      const tarea = await tareaService.createTarea(procesoId, req.body, userId(req));
      res.status(201).json(tarea);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET /api/procesos/:procesoId/tareas
 * List tasks + progress for a process
 */
router.get(
  "/procesos/:procesoId/tareas",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const procesoId = req.params.procesoId;
      if (!procesoId || typeof procesoId !== "string") {
        return res.status(400).json({ error: "procesoId is required" });
      }

      // Verificar ownership del proceso
      const user      = req.user as JWTPayload;
      const rol       = user.rol.nombre;
      const idProfile = user.idProfile;
      if (!idProfile) return res.status(400).json({ error: "idProfile requerido" });

      let proceso: any = null;
      if (rol === "abogado")                              proceso = await storage.getProceoByAbogadoIdAndProcesoId(idProfile, procesoId);
      else if (rol === "bufete" || rol === "corporacion") proceso = await storage.getProcesoByFirmaIdAndProcesoId(idProfile, procesoId);
      else if (rol === "cliente")                         proceso = await storage.getProcesoByClienteIdAndProcesoId(idProfile, procesoId);
      if (!proceso) return res.status(403).json({ error: "Sin acceso al proceso" });

      const stage = req.query.stage as string | undefined;
      const result = await tareaService.getTareasByProceso(procesoId, userId(req), stage);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET /api/tareas/mis-tareas
 * Tasks assigned to the calling lawyer, grouped by status
 */
router.get(
  "/tareas/mis-tareas",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await tareaService.getMisTareas(userId(req));
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * PATCH /api/tareas/:id
 * Edit title / description / priority / deadline / assignee
 */
router.patch(
  "/tareas/:id",
  authenticate,
  validate(updateTareaSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tareaId = req.params.id
      if(!tareaId || typeof tareaId !== "string"){
        return res.status(400).json({ error: "tareaId is required" });
      }
      const tarea = await tareaService.updateTarea(tareaId, req.body, userId(req));
      res.json(tarea);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * PATCH /api/tareas/:id/estado
 * Change task state with business-rule validation
 */
router.patch(
  "/tareas/:id/estado",
  authenticate,
  validate(cambiarEstadoSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tareaId = req.params.id
      if(!tareaId || typeof tareaId !== "string"){
        return res.status(400).json({ error: "tareaId is required" });
      }
      const tarea = await tareaService.cambiarEstado(tareaId, req.body, userId(req));
      res.json(tarea);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * PATCH /api/tareas/:id/completar
 * Shorthand to mark a task as completed
 */
router.patch(
  "/tareas/:id/completar",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tareaId = req.params.id
      if(!tareaId || typeof tareaId !== "string"){
        return res.status(400).json({ error: "tareaId is required" });
      }
      const tarea = await tareaService.completarTarea(tareaId, userId(req));
      res.json(tarea);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * DELETE /api/tareas/:id
 * Soft-delete (only creator)
 */
router.delete(
  "/tareas/:id",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tareaId = req.params.id
      if(!tareaId || typeof tareaId !== "string"){
        return res.status(400).json({ error: "tareaId is required" });
      }
      await tareaService.deleteTarea(tareaId, userId(req));
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

export default router;
