/**
 * Calendar Routes
 * GET /api/calendar         — agregador (tareas + etapas + eventos manuales)
 * POST /api/calendar        — crear evento manual
 * PUT /api/calendar/:id     — editar evento manual
 * DELETE /api/calendar/:id  — eliminar evento manual (soft)
 */

import { Router, type Request, type Response, type NextFunction } from "express";
import { authenticate } from "../auth.js";
import { requireFeature } from "../middleware/require-feature.js";
import { storage } from "../storage/storeage/database-storage.js";
import type { JWTPayload } from "@/shared/model.schema.js";
import type { CreateCalendarEventDTO, UpdateCalendarEventDTO } from "@/shared/schema";

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// Helper: obtener lawyerProfileId del usuario autenticado
// ─────────────────────────────────────────────────────────────────────────────

function getLawyerProfile(req: Request, res: Response): string | null {
  const user = (req as any).user as JWTPayload;
  if (user.rol.nombre !== "abogado") {
    res.status(403).json({ error: "Solo los abogados tienen calendario" });
    return null;
  }
  if (!user.idProfile) {
    res.status(400).json({ error: "Perfil de abogado no encontrado" });
    return null;
  }
  return user.idProfile;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/calendar?from=<ISO>&to=<ISO>
// Devuelve todos los eventos del abogado en el rango: tareas + etapas + manuales
// ─────────────────────────────────────────────────────────────────────────────

router.get("/calendar", authenticate, requireFeature("calendario"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lawyerId = getLawyerProfile(req, res);
    if (!lawyerId) return;

    // Por defecto: mes actual
    const now   = new Date();
    const from  = req.query.from
      ? new Date(req.query.from as string)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const to    = req.query.to
      ? new Date(req.query.to as string)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      res.status(400).json({ error: "Fechas inválidas. Usa formato ISO 8601." });
      return;
    }

    const events = await storage.calendar.getCalendarEvents(lawyerId, from, to);
    res.json(events);
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/calendar — crear evento manual
// ─────────────────────────────────────────────────────────────────────────────

router.post("/calendar", authenticate, requireFeature("calendario"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lawyerId = getLawyerProfile(req, res);
    if (!lawyerId) return;

    const body = req.body as CreateCalendarEventDTO;

    if (!body.titulo || !body.tipo || !body.fechaInicio) {
      res.status(400).json({ error: "titulo, tipo y fechaInicio son requeridos" });
      return;
    }

    const evento = await storage.calendar.create(lawyerId, body);
    res.status(201).json(evento);
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/calendar/:id — editar evento manual
// ─────────────────────────────────────────────────────────────────────────────

router.put("/calendar/:id", authenticate, requireFeature("calendario"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lawyerId = getLawyerProfile(req, res);
    if (!lawyerId) return;

    const eventoId = String(req.params.id);
    const existing = await storage.calendar.findById(eventoId);

    if (!existing) {
      res.status(404).json({ error: "Evento no encontrado" });
      return;
    }
    if (existing.lawyerId !== lawyerId) {
      res.status(403).json({ error: "No tienes acceso a este evento" });
      return;
    }

    const body   = req.body as UpdateCalendarEventDTO;
    const updated = await storage.calendar.update(eventoId, body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/calendar/:id — eliminar evento manual (soft delete)
// ─────────────────────────────────────────────────────────────────────────────

router.delete("/calendar/:id", authenticate, requireFeature("calendario"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lawyerId = getLawyerProfile(req, res);
    if (!lawyerId) return;

    const eventoId = String(req.params.id);
    const existing = await storage.calendar.findById(eventoId);

    if (!existing) {
      res.status(404).json({ error: "Evento no encontrado" });
      return;
    }
    if (existing.lawyerId !== lawyerId) {
      res.status(403).json({ error: "No tienes acceso a este evento" });
      return;
    }

    await storage.calendar.softDelete(eventoId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
