/**
 * Notification (Notificaciones) Routes
 * 
 * Notification management endpoints for clients and lawyers.
 * Maintains backward compatibility with the original monolithic routes.
 */

import { Router, type Request, type Response, type NextFunction } from "express";

import { authenticate, requirePermission } from "../auth.js";
import { storage } from "../storage/storeage/database-storage.js";

const router = Router();

// GET /api/notificaciones/cliente/:clienteId - Get notifications for a client
router.get("/notificaciones/cliente/:clienteId", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { clienteId } = req.params;
    const clienteIdStr = Array.isArray(clienteId) ? clienteId[0] : clienteId;
    const notificaciones = await storage.getNotificacionesByClienteId(clienteIdStr);
    res.json(notificaciones);
  } catch (err) {
    next(err);
  }
});

// GET /api/notificaciones/cliente/:clienteId/count - Get unread count for client


// PUT /api/notificaciones/:id/leer-cliente - Mark notification as read for client
router.put("/notificaciones/:id/leer-cliente", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const notificacionId = parseInt(Array.isArray(id) ? id[0] : id);
    
    if (isNaN(notificacionId)) {
      return res.status(400).json({ error: "ID de notificación inválido" });
    }
    
    await storage.markNotificacionLeidaCliente(notificacionId);
    res.json({ message: "Notificación marcada como leída" });
  } catch (err) {
    next(err);
  }
});

// GET /api/notificaciones/abogado/:abogadoId - Get notifications for a lawyer
router.get("/notificaciones/abogado/:abogadoId", authenticate, requirePermission("notificaciones.ver"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { abogadoId } = req.params;
    const abogadoIdStr = Array.isArray(abogadoId) ? abogadoId[0] : abogadoId;
    const notificaciones = await storage.getNotificacionesByAbogadoId(abogadoIdStr);
    res.json(notificaciones);
  } catch (err) {
    next(err);
  }
});

// GET /api/notificaciones/abogado/:abogadoId/count - Get unread count for lawyer
router.get("/notificaciones/abogado/:abogadoId/count", authenticate, requirePermission("notificaciones.ver"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { abogadoId } = req.params;
    const abogadoIdStr = Array.isArray(abogadoId) ? abogadoId[0] : abogadoId;
    const count = await storage.getNotificacionesCountByAbogadoId(abogadoIdStr);
    res.json({ count });
  } catch (err) {
    next(err);
  }
});

// PUT /api/notificaciones/:id/leer-abogado - Mark notification as read for lawyer
router.put("/notificaciones/:id/leer-abogado", authenticate, requirePermission("notificaciones.ver"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const notificacionId = parseInt(Array.isArray(id) ? id[0] : id);
    
    if (isNaN(notificacionId)) {
      return res.status(400).json({ error: "ID de notificación inválido" });
    }
    
    await storage.markNotificacionLeidaAbogado(notificacionId);
    res.json({ message: "Notificación marcada como leída" });
  } catch (err) {
    next(err);
  }
});

// POST /api/notificaciones - Create new notification
router.post("/notificaciones", authenticate, requirePermission("notificaciones.crear"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notificacionData = req.body;
    
    // Validate required fields
    if (!notificacionData.procesoId || !notificacionData.clienteId || !notificacionData.abogadoId || !notificacionData.titulo || !notificacionData.mensaje) {
      return res.status(400).json({ error: "Faltan campos requeridos" });
    }
    
    const created = await storage.createNotificacion(notificacionData);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

export default router;
