import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import multer from "multer";
import { authenticate } from "../auth.js";
import { tareaService } from "../services/tarea.service.js";
import { validate } from "../middleware/validation.js";
import type { JWTPayload } from "@/shared/model.schema.js";
import { storage } from "../storage/storeage/database-storage.js";
import { subscriptionService } from "../services/subscription.service.js";

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// Validation schemas
// ─────────────────────────────────────────────────────────────────────────────

const tiempoUnidadEnum = z.enum(["minutos", "horas", "dias", "semanas"]).nullable().optional();

// ── File upload (archivos adjuntos a tarea) ───────────────────────────────────

const ALLOWED_MIMES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const tareaUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    cb(null, ALLOWED_MIMES.has(file.mimetype));
  },
});

const createTareaSchema = z.object({
  titulo: z.string().min(1, "El título es requerido").max(255),
  descripcion: z.string().nullable().optional(),
  prioridad: z.enum(["baja", "media", "alta", "urgente"]).optional(),
  fechaLimite: z.string().nullable().optional(),
  asignadoA: z.string().uuid("ID de abogado inválido").nullable().optional(),
  legalStage: z.string().max(50).nullable().optional(),
  requerida: z.boolean().optional(),
  tiempoEstimado: z.number().nullable().optional(),
  tiempoUnidad: tiempoUnidadEnum,
});

const updateTareaSchema = z.object({
  titulo: z.string().min(1).max(255).optional(),
  descripcion: z.string().nullable().optional(),
  prioridad: z.enum(["baja", "media", "alta", "urgente"]).optional(),
  fechaLimite: z.string().nullable().optional(),
  asignadoA: z.string().uuid("ID de abogado inválido").nullable().optional(),
  legalStage: z.string().max(50).nullable().optional(),
  requerida: z.boolean().optional(),
  tiempoEstimado: z.number().nullable().optional(),
  tiempoUnidad: tiempoUnidadEnum,
});

const addObservacionSchema = z.object({
  contenido: z.string().min(1, "El contenido es requerido"),
});

const createSubtareaSchema = z.object({
  titulo: z.string().min(1).max(255),
  descripcion: z.string().nullable().optional(),
  tiempoEstimado: z.number().nullable().optional(),
  tiempoUnidad: tiempoUnidadEnum,
});

const updateSubtareaSchema = z.object({
  titulo: z.string().min(1).max(255).optional(),
  descripcion: z.string().nullable().optional(),
  estado: z.enum(["pendiente", "completada"]).optional(),
  tiempoEstimado: z.number().nullable().optional(),
  tiempoUnidad: tiempoUnidadEnum,
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
 * GET /api/tareas/:id
 * Get a single tarea by ID
 */
router.get(
  "/tareas/:id",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tareaId = req.params.id as string;
      const tarea = await storage.tareas.findById(tareaId);
      if (!tarea) return res.status(404).json({ error: "Tarea no encontrada" });
      res.json(tarea);
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

// ── Observaciones ────────────────────────────────────────────────────────────

router.get(
  "/tareas/:id/observaciones",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tareaId = req.params.id as string;
      const result = await tareaService.getObservaciones(tareaId, userId(req));
      res.json(result);
    } catch (err) { next(err); }
  },
);

router.post(
  "/tareas/:id/observaciones",
  authenticate,
  validate(addObservacionSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tareaId = req.params.id as string;
      const result = await tareaService.addObservacion(tareaId, req.body, userId(req));
      res.status(201).json(result);
    } catch (err) { next(err); }
  },
);

// ── Subtareas ─────────────────────────────────────────────────────────────────

router.get(
  "/tareas/:id/subtareas",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tareaId = req.params.id as string;
      const result = await tareaService.getSubtareas(tareaId, userId(req));
      res.json(result);
    } catch (err) { next(err); }
  },
);

router.post(
  "/tareas/:id/subtareas",
  authenticate,
  validate(createSubtareaSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tareaId = req.params.id as string;
      const result = await tareaService.addSubtarea(tareaId, req.body, userId(req));
      res.status(201).json(result);
    } catch (err) { next(err); }
  },
);

router.patch(
  "/tareas/:id/subtareas/:subId",
  authenticate,
  validate(updateSubtareaSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tareaId = req.params.id as string;
      const subId = req.params.subId as string;
      const result = await tareaService.updateSubtarea(tareaId, subId, req.body, userId(req));
      res.json(result);
    } catch (err) { next(err); }
  },
);

router.delete(
  "/tareas/:id/subtareas/:subId",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tareaId = req.params.id as string;
      const subId = req.params.subId as string;
      await tareaService.deleteSubtarea(tareaId, subId, userId(req));
      res.status(204).send();
    } catch (err) { next(err); }
  },
);

// ── Historial ─────────────────────────────────────────────────────────────────

router.get(
  "/tareas/:id/historial",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tareaId = req.params.id as string;
      const result = await tareaService.getHistorial(tareaId, userId(req));
      res.json(result);
    } catch (err) { next(err); }
  },
);

// ── Archivos ─────────────────────────────────────────────────────────────────

router.get(
  "/tareas/:id/archivos",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await tareaService.getArchivos(req.params.id as string, userId(req));
      res.json(result);
    } catch (err) { next(err); }
  },
);

router.post(
  "/tareas/:id/archivos",
  authenticate,
  tareaUpload.single("file"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tareaId = req.params.id as string;
      const file = req.file;
      if (!file) return res.status(400).json({ error: "No se proporcionó archivo" });

      // Verificar límite de storage del plan
      const uid = (req as any).user?.id;
      const fileSizeMb = file.size / (1024 * 1024);
      const storageCheck = await subscriptionService.checkLimit(uid, "storage", fileSizeMb);
      if (!storageCheck.permitido) {
        return res.status(402).json({
          error: "Has alcanzado el límite de almacenamiento de tu plan. Actualiza para continuar.",
          usado: storageCheck.actual,
          maximo: storageCheck.maximo,
        });
      }

      // Fetch tarea to get procesoId → clienteId for S3 path
      const tarea = await storage.tareas.findRawById(tareaId);
      if (!tarea) return res.status(404).json({ error: "Tarea no encontrada" });
      const proceso = await storage.getProceso(tarea.procesoId);
      if (!proceso) return res.status(404).json({ error: "Proceso no encontrado" });
      const cliente = await storage.getCliente(proceso.clienteId);
      if (!cliente) return res.status(404).json({ error: "Cliente no encontrado" });

      const { uploadDocumentToS3 } = await import("../services/s3-storage.js");
      const s3Key = await uploadDocumentToS3(
        file.buffer,
        cliente.id,
        tarea.procesoId,
        file.originalname,
        file.mimetype,
      );

      const result = await tareaService.addArchivo(
        tareaId,
        file.originalname,
        s3Key,
        file.mimetype,
        file.size,
        userId(req),
      );

      // Registrar uso de storage (en MB, redondeado hacia arriba)
      await subscriptionService.incrementUsage(uid, "storage", Math.ceil(fileSizeMb * 10) / 10).catch(() => {});

      res.status(201).json(result);
    } catch (err) { next(err); }
  },
);

router.get(
  "/tareas/:id/archivos/:archivoId/download",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const archivos = await tareaService.getArchivos(req.params.id as string, userId(req));
      const archivo = archivos.find(a => a.id === req.params.archivoId);
      if (!archivo) return res.status(404).json({ error: "Archivo no encontrado" });

      const { getPresignedDownloadUrl } = await import("../services/s3-storage.js");
      const presignedUrl = await getPresignedDownloadUrl(archivo.url, archivo.nombre, 300);
      res.redirect(presignedUrl);
    } catch (err) { next(err); }
  },
);

router.delete(
  "/tareas/:id/archivos/:archivoId",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const s3Key = await tareaService.deleteArchivo(
        req.params.id as string,
        req.params.archivoId as string,
        userId(req),
      );
      // Fire-and-forget S3 cleanup
      import("../services/s3-storage.js")
        .then(({ deleteDocumentFromS3 }) => deleteDocumentFromS3(s3Key))
        .catch(() => {});
      res.status(204).send();
    } catch (err) { next(err); }
  },
);

export default router;
