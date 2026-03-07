/**
 * Firm Profile Routes
 * 
 * API endpoints for managing firm profiles.
 */

import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";

import { authenticate } from "../auth.js";
import { storage } from "../storage/storeage/database-storage.js";

const router = Router();

// Validation schema
const updateFirmProfileSchema = z.object({
  name: z.string().optional(),
  nit: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  planId: z.string().optional(),
});

// GET /api/firm-profile - Get current firm profile
router.get("/firm-profile", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    
    // Get user to check role
    const dbUser = await storage.getUserById(user.id);
    if (!dbUser || dbUser.rol.nombre !== "bufet") {
      return res.status(403).json({ error: "Acceso denegado. Solo para bufetes." });
    }

    const profile = await storage.getFirmProfileByUserId(user.id);
    if (!profile) {
      return res.status(404).json({ error: "Perfil no encontrado" });
    }

    res.json(profile);
  } catch (err) {
    next(err);
  }
});

// PUT /api/firm-profile - Update firm profile
router.put("/firm-profile", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = updateFirmProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.errors[0].message,
      });
    }

    const user = req.user!;
    
    // Get user to check role
    const dbUser = await storage.getUserById(user.id);
    if (!dbUser || dbUser.rol.nombre !== "bufet") {
      return res.status(403).json({ error: "Acceso denegado. Solo para bufetes." });
    }

    const profile = await storage.getFirmProfileByUserId(user.id);
    if (!profile) {
      return res.status(404).json({ error: "Perfil no encontrado" });
    }

    const updated = await storage.updateFirmProfile(profile.id, parsed.data);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;
