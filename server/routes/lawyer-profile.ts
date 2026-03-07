/**
 * Lawyer Profile Routes
 * 
 * API endpoints for managing lawyer profiles.
 */

import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";

import { authenticate } from "../auth.js";
import { storage } from "../storage/storeage/database-storage";

const router = Router();

// Validation schema
const updateLawyerProfileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  specialization: z.string().optional(),
  licenseNumber: z.string().optional(),
});

// GET /api/lawyer-profile - Get current lawyer profile
router.get("/lawyer-profile", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    
    // Get user to check role
    const dbUser = await storage.getUserById(user.id);
    if (!dbUser || (dbUser.rol.nombre !== "abogado" && dbUser.rol.nombre !== "lawyer")) {
      return res.status(403).json({ error: "Acceso denegado. Solo para abogados." });
    }

    const profile = await storage.getAbogadoByIdUser(user.id);
    if (!profile) {
      return res.status(404).json({ error: "Perfil no encontrado" });
    }

    res.json(profile);
  } catch (err) {
    next(err);
  }
});

// PUT /api/lawyer-profile - Update lawyer profile
router.put("/lawyer-profile", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = updateLawyerProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.errors[0].message,
      });
    }

    const user = req.user!;
    
    // Get user to check role
    const dbUser = await storage.getUserById(user.id);
    if (!dbUser || (dbUser.rol.nombre !== "abogado" && dbUser.rol.nombre !== "lawyer")) {
      return res.status(403).json({ error: "Acceso denegado. Solo para abogados." });
    }

    const profile = await storage.getAbogadoByIdUser(user.id);
    if (!profile) {
      return res.status(404).json({ error: "Perfil no encontrado" });
    }

    const updated = await storage.getAbogadoUpdate(profile.id, parsed.data);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// GET /api/abogado/:id - Get lawyer profile by lawyer ID
router.get("/abogado/:id", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (!id || Array.isArray(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const profile = await storage.abogados.getLawyer(id);
    if (!profile) {
      return res.status(404).json({ error: "Abogado no encontrado" });
    }

    res.json(profile);
  } catch (err) {
    next(err);
  }
});

export default router;
