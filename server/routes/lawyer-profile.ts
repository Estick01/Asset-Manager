/**
 * Lawyer Profile Routes
 */

import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";

import { authenticate } from "../auth.js";
import { storage } from "../storage/storeage/database-storage";

const router = Router();

/** Maps the DB row (with persona/firm JOINs) to the API response shape */
function toResponse(full: any) {
  return {
    id:             full.id,
    userId:         full.userId,
    firmId:         full.firmId ?? null,
    personaId:      full.personaId,
    specialization: full.specialization ?? null,
    licenseNumber:  full.licenseNumber ?? null,
    isIndependent:  full.isIndependent,
    createdAt:      full.createdAt,
    updatedAt:      full.updatedAt,
    // flattened persona fields
    firstName:      full.persona?.nombre    ?? null,
    lastName:       full.persona?.apellido  ?? null,
    phone:          full.persona?.telefono  ?? null,
    address:        full.persona?.direccion ?? null,
    departamentoId: full.persona?.departamentoId ?? null,
    municipioId:    full.persona?.municipioId    ?? null,
    documento:      full.persona?.documento      ?? null,
    tipoDocumentoId: full.persona?.tipoDocumentoId ?? null,
    // relations
    user: full.user ?? null,
    firm: full.firm ?? null,
  };
}

// Validation schema for update
const updateLawyerProfileSchema = z.object({
  firstName:       z.string().optional(),
  lastName:        z.string().optional(),
  phone:           z.string().optional(),
  address:         z.string().optional(),
  specialization:  z.string().optional(),
  licenseNumber:   z.string().optional(),
  departamentoId:  z.string().optional(),
  municipioId:     z.string().optional(),
});

// ---------------------------------------------------------------------------
// GET /api/lawyer-profile/:lawyerId/profile  — public profile by lawyer ID
// ---------------------------------------------------------------------------
router.get("/lawyer-profile/:lawyerId/profile", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { lawyerId } = req.params;
    if (!lawyerId || Array.isArray(lawyerId)) {
      return res.status(400).json({ error: "ID de abogado inválido" });
    }

    const full = await storage.abogados.getLawyer(lawyerId);
    if (!full) return res.status(404).json({ error: "Perfil no encontrado" });

    res.json(toResponse(full));
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/lawyer-profile  — own profile (full, with persona + firm)
// ---------------------------------------------------------------------------
router.get("/lawyer-profile", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;

    const dbUser = await storage.getUserById(user.id);
    if (!dbUser || (dbUser.rol.nombre !== "abogado" && dbUser.rol.nombre !== "lawyer")) {
      return res.status(403).json({ error: "Acceso denegado. Solo para abogados." });
    }

    const full = await storage.abogados.getLawyerByUserIdFull(user.id);
    if (!full) return res.status(404).json({ error: "Perfil no encontrado" });

    res.json(toResponse(full));
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// PUT /api/lawyer-profile  — update own profile
// ---------------------------------------------------------------------------
router.put("/lawyer-profile", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = updateLawyerProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }

    const user = req.user!;

    const dbUser = await storage.getUserById(user.id);
    if (!dbUser || (dbUser.rol.nombre !== "abogado" && dbUser.rol.nombre !== "lawyer")) {
      return res.status(403).json({ error: "Acceso denegado. Solo para abogados." });
    }

    const profile = await storage.getAbogadoByIdUser(user.id);
    if (!profile) return res.status(404).json({ error: "Perfil no encontrado" });

    const { firstName, lastName, phone, address, departamentoId, municipioId, specialization, licenseNumber } = parsed.data;

    await storage.abogados.updateLawyer(profile.id, {
      specialization,
      licenseNumber,
      persona: {
        ...(firstName        !== undefined && { nombre:         firstName }),
        ...(lastName         !== undefined && { apellido:       lastName }),
        ...(phone            !== undefined && { telefono:       phone }),
        ...(address          !== undefined && { direccion:      address }),
        ...(departamentoId   !== undefined && { departamentoId }),
        ...(municipioId      !== undefined && { municipioId }),
      },
    });

    const full = await storage.abogados.getLawyerByUserIdFull(user.id);
    res.json(full ? toResponse(full) : {});
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/abogado/:id  — lawyer by profile ID (for firm use)
// ---------------------------------------------------------------------------
router.get("/abogado/:id", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!id || Array.isArray(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const profile = await storage.abogados.getLawyer(id);
    if (!profile) return res.status(404).json({ error: "Abogado no encontrado" });

    res.json(toResponse(profile));
  } catch (err) {
    next(err);
  }
});

export default router;
