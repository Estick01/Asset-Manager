/**
 * Firm Invitations Routes
 * 
 * API endpoints for managing firm invitations (inviting lawyers to firms).
 */

import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";

import { authenticate } from "../auth.js";
import { storage } from "../storage/storeage/database-storage.js";

const router = Router();

// Validation schemas
const createInvitationSchema = z.object({
  lawyerId: z.string().min(1, "El ID del abogado es requerido"),
  mensaje: z.string().optional(),
});

// ============================================
// FIRM ROUTES - /api/firm/invitations
// ============================================

// GET /api/firm/invitations - Get all invitations for a firm
router.get("/firm/invitations", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const { status } = req.query;

    if (!user.idProfile) {
      return res.status(403).json({ error: "No tienes una firma asociada" });
    }

    if(user.rol.nombre === "abogado" || user.rol.nombre === "cliente"){
      return res.status(403).json({ error: "No tienes permiso para realizar esta acción" });
    }

    const allInvitations = await storage.firmInvitation.getByFirmId(user.idProfile);

    // Filter by status if provided
    let invitations = allInvitations;
    if (status && typeof status === "string") {
      invitations = allInvitations.filter((inv: any) => inv.status === status);
    }

    res.json(invitations);
  } catch (err) {
    next(err);
  }
});

// GET /api/firm/invitations/search-lawyers - Search available lawyers
router.get("/firm/invitations/search-lawyers", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const { search } = req.query;

    if (!user.idProfile ) {
      return res.status(403).json({ error: "No tienes una firma asociada" });
    }
    if(user.rol.nombre === "abogado" || user.rol.nombre === "cliente"){
      return res.status(403).json({ error: "No tienes permiso para realizar esta acción" });
    }

    if (!search || typeof search !== "string") {
      return res.status(400).json({ error: "Parámetro de búsqueda requerido" });
    }

    // Search lawyers using the storage method
    const lawyers = await storage.firmInvitation.searchAvailableLawyers(search, user.firmId);

    res.json(lawyers);
  } catch (err) {
    next(err);
  }
});

// POST /api/firm/invitations - Create a new invitation
router.post("/firm/invitations", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const data = createInvitationSchema.parse(req.body);

    if (!user.idProfile ) {
      return res.status(403).json({ error: "No tienes una firma asociada" });
    }
    if(user.rol.nombre === "abogado" || user.rol.nombre === "cliente"){
      return res.status(403).json({ error: "No tienes permiso para realizar esta acción" });
    }

    // Check if invitation already exists
    const existing = await storage.firmInvitation.getExistingPending(user.idProfile, data.lawyerId);

    if (existing) {
      return res.status(400).json({ 
        error: "Ya existe una invitación pendiente para este abogado en esta firma" 
      });
    }

    // Create invitation - note: storage generates its own id
    const invitation = await storage.firmInvitation.create({
      firmId: user.idProfile,
      lawyerId: data.lawyerId,
      invitadoPor: user.id,
      mensaje: data.mensaje ?? null,
    });

    res.status(201).json(invitation);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Datos inválidos", 
        details: err.errors 
      });
    }
    next(err);
  }
});

// POST /api/firm/invitations/:id/cancel - Cancel an invitation
router.post("/firm/invitations/:id/cancel", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    if (!user.firmId) {
      return res.status(403).json({ error: "No tienes una firma asociada" });
    }

    if (!id || Array.isArray(id)) {
      return res.status(400).json({ error: "ID de invitación inválido" });
    }

    const invitation = await storage.firmInvitation.getById(id);

    if (!invitation) {
      return res.status(404).json({ error: "Invitación no encontrada" });
    }

    // Verify the invitation belongs to this firm
    if (invitation.firmId !== user.firmId) {
      return res.status(403).json({ error: "No tienes permiso para cancelar esta invitación" });
    }

    await storage.firmInvitation.cancel(id);

    res.json({ message: "Invitación cancelada correctamente" });
  } catch (err) {
    next(err);
  }
});

// ============================================
// LAWYER ROUTES - /api/lawyer/invitations
// ============================================

// GET /api/lawyer/invitations - Get all invitations for a lawyer
router.get("/lawyer/invitations", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const { status } = req.query;

    if (user.rol.id !== 2) {
      return res.status(403).json({ error: "Solo los abogados pueden acceder a estas invitaciones" });
    }

    const lawyerProfile = await storage.lawyerProfiles.getLawyerByUserId(user.id);
    
    if (!lawyerProfile) {
      return res.status(404).json({ error: "Perfil de abogado no encontrado" });
    }

    const allInvitations = await storage.firmInvitation.getPendingByLawyerId(lawyerProfile.id);

    let invitations = allInvitations;
    if (status && typeof status === "string") {
      invitations = allInvitations.filter((inv: any) => inv.status === status);
    }

    res.json(invitations);
  } catch (err) {
    next(err);
  }
});

// POST /api/lawyer/invitations/:id/accept - Accept invitation
router.post("/lawyer/invitations/:id/accept", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    if (!id || Array.isArray(id)) {
      return res.status(400).json({ error: "ID de invitación inválido" });
    }

    if (user.rol.id !== 2) {
      return res.status(403).json({ error: "Solo los abogados pueden aceptar invitaciones" });
    }

    const invitation = await storage.firmInvitation.getById(id);
    if (!invitation) {
      return res.status(404).json({ error: "Invitación no encontrada" });
    }

    const lawyerProfile = await storage.lawyerProfiles.getLawyerByUserId(user.id);
    if (!lawyerProfile || lawyerProfile.id !== invitation.lawyerId) {
      return res.status(403).json({ error: "No tienes permiso para aceptar esta invitación" });
    }

    if (invitation.status !== "pendiente") {
      return res.status(400).json({ error: "Esta invitación ya ha sido procesada" });
    }

    // 1. Aceptar invitación
    await storage.firmInvitation.accept(id);

    // 2. Si tiene firma activa, retirar primero
    const activeHistory = await storage.lawyerFirmaHistory.getActiveByLawyerId(lawyerProfile.id);
    if (activeHistory) {
      await storage.lawyerFirmaHistory.retireLawyer(
        activeHistory.id,
        "Transferido a otra firma",
      );
    }

    // 3. Crear registro en lawyerFirmaHistory
    await storage.lawyerFirmaHistory.create({
      lawyerId: lawyerProfile.id,
      firmaId: invitation.firmId,
      createdBy: user.id,
      notas: `Ingresó por invitación ${id}`,
      estado: "activo",
    });

    // 4. Actualizar firmId en lawyerProfiles
    await storage.lawyerProfiles.updateFirmId(lawyerProfile.id, invitation.firmId);

    res.json({ message: "Invitación aceptada correctamente" });
  } catch (err) {
    next(err);
  }
});

// POST /api/lawyer/invitations/:id/reject - Reject invitation
router.post("/lawyer/invitations/:id/reject", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    const { motivoRechazo } = req.body;

    if (!id || Array.isArray(id)) {
      return res.status(400).json({ error: "ID de invitación inválido" });
    }

    if (user.rol.id !== 2) { // Only lawyers
      return res.status(403).json({ error: "Solo los abogados pueden rechazar invitaciones" });
    }

    const invitation = await storage.firmInvitation.getById(id);

    if (!invitation) {
      return res.status(404).json({ error: "Invitación no encontrada" });
    }

    // Get lawyer profile
    const lawyerProfile = await storage.lawyerProfiles.getLawyerByUserId(user.id);
    
    if (!lawyerProfile || lawyerProfile.id !== invitation.lawyerId) {
      return res.status(403).json({ error: "No tienes permiso para rechazar esta invitación" });
    }

    if (invitation.status !== "pendiente") {
      return res.status(400).json({ error: "Esta invitación ya ha sido procesada" });
    }

    // Reject invitation
    await storage.firmInvitation.reject(id, motivoRechazo);

    res.json({ message: "Invitación rechazada correctamente" });
  } catch (err) {
    next(err);
  }
});

export default router;
