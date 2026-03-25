// server/routes/proceso-ownership.ts
import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { authenticate } from "../auth.js";
import { storage } from "../storage/storeage/database-storage.js";
import { JWTPayload } from "@/shared/model.schema.js";

const router = Router();

// Helper to get userId from request
function getUserId(req: Request): string {
  return ((req as any).user as JWTPayload).id ?? "";
}

const transferSchema = z.object({
  ownerType: z.enum(["abogado", "bufete"]),
  ownerId:   z.string().uuid().nullable(),
  razon:     z.string().max(500).optional(),
});

const shareSchema = z.object({
  sharedWithType: z.enum(["bufete", "corporacion", "cliente"]),
  sharedWithId:   z.string().uuid(),
  permission:     z.enum(["ver", "comentar", "editar"]),
  razon:          z.string().max(500).optional(),
});

// POST /api/procesos/:id/ownership/transfer
router.post(
  "/procesos/:id/ownership/transfer",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = transferSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

      const procesoId = req.params.id as string;
      const creadoPor = getUserId(req);
      const result = await storage.procesoOwnership.transfer(procesoId, parsed.data, creadoPor);
      res.json(result);
    } catch (err) { next(err); }
  },
);

// GET /api/procesos/:id/ownership/history
router.get(
  "/procesos/:id/ownership/history",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const history = await storage.procesoOwnership.getHistory(req.params.id as string);
      res.json(history);
    } catch (err) { next(err); }
  },
);

// POST /api/procesos/:id/sharing
router.post(
  "/procesos/:id/sharing",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = shareSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

      const procesoId = req.params.id as string;
      const creadoPor = getUserId(req);
      const result = await storage.procesoSharing.upsert(procesoId, parsed.data, creadoPor);
      res.json(result);
    } catch (err) { next(err); }
  },
);

// DELETE /api/procesos/:id/sharing/:shareId
router.delete(
  "/procesos/:id/sharing/:shareId",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await storage.procesoSharing.revoke(req.params.shareId as string, req.params.id as string);
      res.json({ success: true });
    } catch (err) { next(err); }
  },
);

// GET /api/procesos/:id/sharing
router.get(
  "/procesos/:id/sharing",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sharing = await storage.procesoSharing.getActive(req.params.id as string);
      res.json(sharing);
    } catch (err) { next(err); }
  },
);

// POST /api/procesos/batch-decisions
const batchDecisionSchema = z.object({
  bufeteId: z.string().uuid(),
  decisions: z.array(z.object({
    procesoId:  z.string().uuid(),
    action:     z.enum(["privado", "compartir", "transferir"]),
    permission: z.enum(["ver", "comentar", "editar"]).optional(),
  })),
});

router.post(
  "/procesos/batch-decisions",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = batchDecisionSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

      const user = (req as any).user as JWTPayload;
      if ((user as any).rol?.nombre !== "abogado") {
        return res.status(403).json({ error: "Solo el abogado puede ejecutar batch-decisions" });
      }

      const { bufeteId, decisions } = parsed.data;
      const userId = (user as any).id ?? (user as any).userId ?? "";
      const results = { transferidos: 0, compartidos: 0, privados: 0, errores: [] as string[] };

      for (const d of decisions) {
        try {
          const ownership = await storage.procesoOwnership.getActive(d.procesoId);
          if (!ownership || ownership.ownerType !== "abogado" || ownership.ownerId !== user.idProfile) {
            results.errores.push(`${d.procesoId}: sin ownership`);
            continue;
          }
          if (d.action === "transferir") {
            await storage.procesoOwnership.transfer(
              d.procesoId,
              { ownerType: "bufete", ownerId: bufeteId, razon: "Transferido al unirse al bufete" },
              userId,
            );
            results.transferidos++;
          } else if (d.action === "compartir") {
            await storage.procesoSharing.upsert(
              d.procesoId,
              { sharedWithType: "bufete", sharedWithId: bufeteId, permission: d.permission ?? "ver", razon: "Compartido al unirse al bufete" },
              userId,
            );
            results.compartidos++;
          } else {
            results.privados++;
          }
        } catch (e: any) {
          results.errores.push(`${d.procesoId}: ${e.message}`);
        }
      }

      res.json(results);
    } catch (err) { next(err); }
  },
);

// GET /api/firm/:firmId/pending-reassignments
// TODO(Task 21): implement getPendingReassignmentIds in ProcesoOwnershipStorage
router.get(
  "/firm/:firmId/pending-reassignments",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user as JWTPayload;
      const rol = (user as any).rol?.nombre ?? "";
      if (rol !== "bufete" && rol !== "corporacion") {
        return res.status(403).json({ error: "Acceso denegado" });
      }
      // TODO(Task 21): implement getPendingReassignmentIds and replace stub below
      const ids: string[] = [];
      const procesos = await storage.getProcesosByIds(ids, {});
      res.json(procesos);
    } catch (err) { next(err); }
  },
);

export default router;
