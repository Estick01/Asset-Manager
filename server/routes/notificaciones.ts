/**
 * Notification (Notificaciones) Routes
 *
 * Endpoints for clients, lawyers and firms to read/mark notifications.
 */

import { Router, type Request, type Response, type NextFunction } from "express";
import { authenticate, requirePermission } from "../auth.js";
import { storage } from "../storage/storeage/database-storage.js";

const router = Router();

// ─── Client ──────────────────────────────────────────────────────────────────

router.get("/notificaciones/cliente/:clienteId", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notificaciones = await storage.getNotificacionesByClienteId(req.params.clienteId);
    res.json(notificaciones);
  } catch (err) { next(err); }
});

router.get("/notificaciones/cliente/:clienteId/count", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const count = await storage.getNotificacionesCountByClienteId(req.params.clienteId);
    res.json({ count });
  } catch (err) { next(err); }
});

router.put("/notificaciones/:id/leer-cliente", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "ID inválido" });
    await storage.markNotificacionLeidaCliente(id);
    res.json({ message: "Notificación marcada como leída" });
  } catch (err) { next(err); }
});

router.put("/notificaciones/cliente/:clienteId/leer-todas", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await storage.markTodasLeidasCliente(req.params.clienteId);
    res.json({ message: "Todas las notificaciones marcadas como leídas" });
  } catch (err) { next(err); }
});

// ─── Lawyer ───────────────────────────────────────────────────────────────────

router.get("/notificaciones/abogado/:abogadoId", authenticate, requirePermission("notificaciones.ver"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notificaciones = await storage.getNotificacionesByAbogadoId(req.params.abogadoId);
    res.json(notificaciones);
  } catch (err) { next(err); }
});

router.get("/notificaciones/abogado/:abogadoId/count", authenticate, requirePermission("notificaciones.ver"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const count = await storage.getNotificacionesCountByAbogadoId(req.params.abogadoId);
    res.json({ count });
  } catch (err) { next(err); }
});

router.put("/notificaciones/:id/leer-abogado", authenticate, requirePermission("notificaciones.ver"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "ID inválido" });
    await storage.markNotificacionLeidaAbogado(id);
    res.json({ message: "Notificación marcada como leída" });
  } catch (err) { next(err); }
});

router.put("/notificaciones/abogado/:abogadoId/leer-todas", authenticate, requirePermission("notificaciones.ver"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await storage.markTodasLeidasAbogado(req.params.abogadoId);
    res.json({ message: "Todas las notificaciones marcadas como leídas" });
  } catch (err) { next(err); }
});

// ─── Firm ─────────────────────────────────────────────────────────────────────

router.get("/notificaciones/firma/:firmaId", authenticate, requirePermission("notificaciones.ver"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notificaciones = await storage.getNotificacionesByFirmaId(req.params.firmaId);
    res.json(notificaciones);
  } catch (err) { next(err); }
});

router.get("/notificaciones/firma/:firmaId/count", authenticate, requirePermission("notificaciones.ver"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const count = await storage.getNotificacionesCountByFirmaId(req.params.firmaId);
    res.json({ count });
  } catch (err) { next(err); }
});

router.put("/notificaciones/:id/leer-firma", authenticate, requirePermission("notificaciones.ver"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "ID inválido" });
    await storage.markNotificacionLeidaFirma(id);
    res.json({ message: "Notificación marcada como leída" });
  } catch (err) { next(err); }
});

router.put("/notificaciones/firma/:firmaId/leer-todas", authenticate, requirePermission("notificaciones.ver"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await storage.markTodasLeidasFirma(req.params.firmaId);
    res.json({ message: "Todas las notificaciones marcadas como leídas" });
  } catch (err) { next(err); }
});

export default router;
