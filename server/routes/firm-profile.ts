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
  // Representante legal
  repNombre: z.string().optional(),
  repApellido: z.string().optional(),
  repCargo: z.string().optional(),
  repEmail: z.string().email().optional(),
  repTelefono: z.string().optional(),
  repDocumento: z.string().optional(),
});

// GET /api/firm-profile - Get current firm profile
router.get("/firm-profile", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;

    const dbUser = await storage.getUserById(user.id);
    if (!dbUser || dbUser.rol.nombre !== "bufete") {
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

// PUT /api/firm-profile - Update firm profile (including representante legal)
router.put("/firm-profile", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = updateFirmProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }

    const user = req.user!;

    const dbUser = await storage.getUserById(user.id);
    if (!dbUser || dbUser.rol.nombre !== "bufete") {
      return res.status(403).json({ error: "Acceso denegado. Solo para bufetes." });
    }

    const profile = await storage.getFirmProfileByUserId(user.id);
    if (!profile) {
      return res.status(404).json({ error: "Perfil no encontrado" });
    }

    const { repNombre, repApellido, repCargo, repEmail, repTelefono, repDocumento, ...firmUpdates } = parsed.data;

    // Update firm basic data
    await storage.updateFirmProfile(profile.id, firmUpdates);

    // Sync users.name when firm name changes
    if (firmUpdates.name) {
      await storage.users.updateUser(user.id, { name: firmUpdates.name });
    }

    // Handle representante legal
    const hasRepData = repNombre || repApellido || repCargo || repEmail;
    if (hasRepData) {
      if (profile.representanteLegalId) {
        // Update existing representante legal
        const rep = await storage.representantesLegales.getRepresentante(profile.representanteLegalId);
        if (rep) {
          if (rep.personaId) {
            await storage.personas.updatePersona(rep.personaId, {
              ...(repNombre && { nombre: repNombre }),
              ...(repApellido && { apellido: repApellido }),
              ...(repTelefono && { telefono: repTelefono }),
              ...(repDocumento && { documento: repDocumento }),
            });
          }
          await storage.representantesLegales.updateRepresentante(profile.representanteLegalId, {
            ...(repCargo && { cargo: repCargo }),
            ...(repEmail && { email: repEmail }),
          });
        }
      } else {
        // Create new representante legal
        const persona = await storage.personas.createPersona({
          nombre: repNombre || "",
          apellido: repApellido || "",
          telefono: repTelefono || "",
          documento: repDocumento || "",
          tipoDocumentoId: 1,
        });
        const rep = await storage.representantesLegales.createRepresentante({
          personaId: persona.id,
          cargo: repCargo || "Representante Legal",
          email: repEmail || "",
        });
        await storage.updateFirmProfile(profile.id, { representanteLegalId: rep.id });
      }
    }

    const updated = await storage.getFirmProfileByUserId(user.id);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;
