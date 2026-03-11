/**
 * Lawyer Firma History Routes
 * 
 * API endpoints for managing lawyer-firm history (association history).
 */

import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";

import { authenticate, extractToken, verifyToken } from "../auth.js";
import { storage } from "../storage/storeage/database-storage.js";
import { JWTPayload } from "@/shared/model.schema.js";

const router = Router();

// Validation schemas
const createHistorySchema = z.object({
  lawyerId: z.string().min(1, "El ID del abogado es requerido"),
  firmaId: z.string().min(1, "El ID de la firma es requerido"),
  fechaIngreso: z.date().optional(),
  notas: z.string().optional(),
});

const updateHistorySchema = z.object({
  fechaSalida: z.date().optional().nullable(),
  motivoSalida: z.string().optional(),
  estado: z.enum(["activo", "retirado", "suspendido", "transferido"]).optional(),
  notas: z.string().optional(),
});

const transferLawyerSchema = z.object({
  nuevaFirmaId: z.string().min(1, "El ID de la nueva firma es requerido"),
  notas: z.string().optional(),
});

// GET /api/lawyer-firma-history - Get all history records (with optional filters)
router.get("/lawyer-firma-history", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { lawyerId, firmaId, estado } = req.query;

    let records: any[] = [];

    if (lawyerId && typeof lawyerId === "string") {
      records = await storage.lawyerFirmaHistory.getByLawyerId(lawyerId);
    } else if (firmaId && typeof firmaId === "string") {
      records = await storage.lawyerFirmaHistory.getByFirmaId(firmaId);
    } else {
      // Return empty if no filters
      records = [];
    }

    // Filter by estado if provided
    if (estado && typeof estado === "string") {
      records = records.filter((r: any) => r.estado === estado);
    }

    res.json(records);
  } catch (err) {
    next(err);
  }
});

// GET /api/lawyer-firma-history/active/:lawyerId - Get active firm for a lawyer
router.get("/lawyer-firma-history/active/:lawyerId", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { lawyerId } = req.params;

    if (!lawyerId || Array.isArray(lawyerId)) {
      return res.status(400).json({ error: "ID de abogado inválido" });
    }

    const record = await storage.lawyerFirmaHistory.getActiveByLawyerId(lawyerId);

    if (!record) {
      return res.status(404).json({ error: "No se encontró registro activo para este abogado" });
    }

    res.json(record);
  } catch (err) {
    next(err);
  }
});

// GET /api/lawyer-firma-history/members/:firmaId - Get active members of a firm
router.get("/lawyer-firma-history/members", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ error: "No se proporcionó token" });
    }

    const { idProfile } = verifyToken(token) as JWTPayload;

    if (!idProfile || Array.isArray(idProfile)) {
      return res.status(400).json({ error: "ID de firma inválido" });
    }

    const members = await storage.lawyerFirmaHistory.getActiveMembersByFirmaId(idProfile);

    res.json(members);
  } catch (err) {
    next(err);
  }
});

// GET /api/lawyer-firma-history/count/:firmaId - Count active members of a firm
router.get("/lawyer-firma-history/count/:firmaId", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { firmaId } = req.params;

    if (!firmaId || Array.isArray(firmaId)) {
      return res.status(400).json({ error: "ID de firma inválido" });
    }

    const count = await storage.lawyerFirmaHistory.countActiveMembers(firmaId);

    res.json({ count });
  } catch (err) {
    next(err);
  }
});

// GET /api/lawyer-firma-history/:id - Get history record by ID
router.get("/lawyer-firma-history/:id", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (!id || Array.isArray(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const record = await storage.lawyerFirmaHistory.getById(id);

    if (!record) {
      return res.status(404).json({ error: "Registro no encontrado" });
    }

    res.json(record);
  } catch (err) {
    next(err);
  }
});

// POST /api/lawyer-firma-history - Create new history record (add lawyer to firm)
router.post("/lawyer-firma-history", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createHistorySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.errors[0].message,
      });
    }

    const user = req.user!;

    // Check if lawyer already has an active membership
    const existingActive = await storage.lawyerFirmaHistory.getActiveByLawyerId(parsed.data.lawyerId);
    if (existingActive) {
      return res.status(400).json({
        error: "El abogado ya tiene una membresía activa en otra firma"
      });
    }

    const record = await storage.lawyerFirmaHistory.create({
      ...parsed.data,
      createdBy: user.id,
    });

    res.status(201).json(record);
  } catch (err) {
    next(err);
  }
});

// PUT /api/lawyer-firma-history/:id - Update history record
router.put("/lawyer-firma-history/:id", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (!id || Array.isArray(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const parsed = updateHistorySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.errors[0].message,
      });
    }

    const record = await storage.lawyerFirmaHistory.update(id, parsed.data);

    if (!record) {
      return res.status(404).json({ error: "Registro no encontrado" });
    }

    res.json(record);
  } catch (err) {
    next(err);
  }
});

// POST /api/lawyer-firma-history/:id/retire - Retire lawyer from firm
router.post("/lawyer-firma-history/:id/retire", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (!id || Array.isArray(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const { motivoSalida, notas } = req.body;

    if (!motivoSalida) {
      return res.status(400).json({ error: "El motivo de salida es requerido" });
    }

    const record = await storage.lawyerFirmaHistory.retireLawyer(id, motivoSalida, notas);

    if (!record) {
      return res.status(404).json({ error: "Registro no encontrado" });
    }

    res.json(record);
  } catch (err) {
    next(err);
  }
});

// POST /api/lawyer-firma-history/:id/suspend - Suspend lawyer
router.post("/lawyer-firma-history/:id/suspend", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (!id || Array.isArray(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const { notas } = req.body;

    const record = await storage.lawyerFirmaHistory.suspendLawyer(id, notas);

    if (!record) {
      return res.status(404).json({ error: "Registro no encontrado" });
    }

    res.json(record);
  } catch (err) {
    next(err);
  }
});

// POST /api/lawyer-firma-history/:id/reactivate - Reactivate lawyer
router.post("/lawyer-firma-history/:id/reactivate", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (!id || Array.isArray(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const { notas } = req.body;

    const record = await storage.lawyerFirmaHistory.reactivateLawyer(id, notas);

    if (!record) {
      return res.status(404).json({ error: "Registro no encontrado" });
    }

    res.json(record);
  } catch (err) {
    next(err);
  }
});

// POST /api/lawyer-firma-history/:id/transfer - Transfer lawyer to another firm
router.post("/lawyer-firma-history/:id/transfer", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (!id || Array.isArray(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const parsed = transferLawyerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.errors[0].message,
      });
    }

    const user = req.user!;

    const record = await storage.lawyerFirmaHistory.transferLawyer(
      id,
      parsed.data.nuevaFirmaId,
      user.id,
      parsed.data.notas
    );

    if (!record) {
      return res.status(404).json({ error: "Registro no encontrado" });
    }

    res.json(record);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/lawyer-firma-history/:id - Delete history record
router.delete("/lawyer-firma-history/:id", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (!id || Array.isArray(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    await storage.lawyerFirmaHistory.delete(id);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
