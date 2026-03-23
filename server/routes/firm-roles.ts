/**
 * Firm Roles Routes
 *
 * Endpoints for a firm (bufete) to manage its custom roles and assign them
 * to its member lawyers.  All routes require the caller to be authenticated
 * as a bufete user.
 *
 * Routes:
 *   GET    /api/firm/roles                          - list firm's custom roles
 *   POST   /api/firm/roles                          - create a new firm role
 *   DELETE /api/firm/roles/:rolId                   - delete a firm role
 *   GET    /api/firm/roles/:rolId/permisos          - get permissions of a role
 *   PUT    /api/firm/roles/:rolId/permisos          - replace permissions of a role
 *   GET    /api/firm/lawyers/:lawyerId/firm-role    - get current firm role of a lawyer
 *   PUT    /api/firm/lawyers/:lawyerId/firm-role    - assign (or clear) firm role to lawyer
 */

import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { authenticate } from "../auth.js";
import { storage } from "../storage/storeage/database-storage.js";
import { EnumRol } from "@/shared/schema/user.schema.js";

const router = Router();

/** Middleware: only allows authenticated bufete users */
function requireBufete(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: "No autenticado" });
  if (req.user.rol.id !== EnumRol.BUFETE.id) {
    return res.status(403).json({ error: "Solo los bufetes pueden acceder a este recurso" });
  }
  next();
}

const guardBufete = [authenticate, requireBufete];

/**
 * Returns the firm profile ID from the JWT — no DB call needed.
 * `idProfile` is set to the firm profile ID at login for bufete users.
 */
function getFirmId(req: Request, res: Response): string | null {
  const firmId = req.user?.idProfile;
  if (!firmId) {
    res.status(404).json({ error: "Perfil de bufete no encontrado" });
    return null;
  }
  return firmId;
}

// ---------------------------------------------------------------------------
// GET /api/firm/roles  — list all custom roles of the authenticated firm
// ---------------------------------------------------------------------------
router.get("/firm/roles", ...guardBufete, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const firmId = getFirmId(req, res);
    if (!firmId) return;

    const roles = await storage.roles.getFirmRoles(firmId);
    res.json(roles);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/firm/roles  — create a new custom role for the firm
// ---------------------------------------------------------------------------
const createRolSchema = z.object({
  nombre: z.string().min(2).max(50),
  descripcion: z.string().max(255).optional(),
});

router.post("/firm/roles", ...guardBufete, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createRolSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }

    const firmId = getFirmId(req, res);
    if (!firmId) return;

    // The DB has a composite unique (nombre, firm_id) — let it handle duplicates.
    // We still do a friendly pre-check to return a clear error message.
    const newRol = await storage.roles.createRol({
      nombre: parsed.data.nombre,
      descripcion: parsed.data.descripcion ?? null,
      firmId,
    });

    res.status(201).json(newRol);
  } catch (err: any) {
    // MySQL duplicate entry error for the composite unique constraint
    if (err?.code === "ER_DUP_ENTRY" || err?.message?.includes("Duplicate entry")) {
      return res.status(400).json({ error: "Ya existe un rol con ese nombre en tu bufete" });
    }
    next(err);
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/firm/roles/:rolId  — delete a firm role (only if no active lawyers assigned)
// ---------------------------------------------------------------------------
router.delete("/firm/roles/:rolId", ...guardBufete, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rolId = parseInt(req.params.rolId, 10);
    if (isNaN(rolId)) return res.status(400).json({ error: "ID de rol inválido" });

    const firmId = getFirmId(req, res);
    if (!firmId) return;

    const rol = await storage.roles.getRol(rolId);
    if (!rol || rol.firmId !== firmId) {
      return res.status(404).json({ error: "Rol no encontrado en tu bufete" });
    }

    // Safety: refuse deletion if lawyers are actively assigned to this role
    const inUse = await storage.roles.hasFirmRolAssigned(rolId);
    if (inUse) {
      return res.status(409).json({
        error: "No se puede eliminar: hay abogados asignados a este rol. Reasígnalos primero.",
      });
    }

    await storage.roles.deleteRol(rolId);
    res.json({ message: "Rol eliminado correctamente" });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/firm/roles/:rolId/permisos  — get the permissions of a firm role
// ---------------------------------------------------------------------------
router.get("/firm/roles/:rolId/permisos", ...guardBufete, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rolId = parseInt(req.params.rolId, 10);
    if (isNaN(rolId)) return res.status(400).json({ error: "ID de rol inválido" });

    const firmId = getFirmId(req, res);
    if (!firmId) return;

    const rol = await storage.roles.getRol(rolId);
    if (!rol || rol.firmId !== firmId) {
      return res.status(404).json({ error: "Rol no encontrado en tu bufete" });
    }

    const permisos = await storage.getPermisosByRol(rolId);
    res.json(permisos);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// PUT /api/firm/roles/:rolId/permisos  — replace all permissions of a firm role
// ---------------------------------------------------------------------------
const setPermisosSchema = z.object({
  permisosIds: z.array(z.number().int().positive()),
});

router.put("/firm/roles/:rolId/permisos", ...guardBufete, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rolId = parseInt(req.params.rolId, 10);
    if (isNaN(rolId)) return res.status(400).json({ error: "ID de rol inválido" });

    const parsed = setPermisosSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }

    const firmId = getFirmId(req, res);
    if (!firmId) return;

    // Security: only the owning firm can modify its roles
    const rol = await storage.roles.getRol(rolId);
    if (!rol || rol.firmId !== firmId) {
      return res.status(404).json({ error: "Rol no encontrado en tu bufete" });
    }

    // Security: validate that all permiso IDs actually exist in the system
    const allPermisos = await storage.getPermisos();
    const validIds = new Set(allPermisos.map((p: any) => p.id));
    const invalidIds = parsed.data.permisosIds.filter(id => !validIds.has(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({ error: `IDs de permiso inválidos: ${invalidIds.join(", ")}` });
    }

    await storage.permisos.assignPermisosToRol(rolId, parsed.data.permisosIds);

    // Reconstruct from the already-fetched allPermisos — avoids a second DB query
    const updatedPermisos = allPermisos.filter((p: any) => parsed.data.permisosIds.includes(p.id));
    res.json({ message: "Permisos actualizados", permisos: updatedPermisos });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/firm/lawyers/:lawyerId/firm-role  — get current firm role of a lawyer
// ---------------------------------------------------------------------------
router.get("/firm/lawyers/:lawyerId/firm-role", ...guardBufete, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { lawyerId } = req.params;

    const firmId = getFirmId(req, res);
    if (!firmId) return;

    const active = await storage.lawyerFirmaHistory.getActiveByLawyerId(lawyerId);
    if (!active || active.firmaId !== firmId) {
      return res.status(404).json({ error: "El abogado no es miembro activo de tu bufete" });
    }

    res.json({ firmRolId: active.firmRolId ?? null });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// PUT /api/firm/lawyers/:lawyerId/firm-role  — assign (or clear) a firm role to a lawyer
// ---------------------------------------------------------------------------
const assignRolSchema = z.object({
  firmRolId: z.number().int().positive().nullable(),
});

router.put("/firm/lawyers/:lawyerId/firm-role", ...guardBufete, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { lawyerId } = req.params;

    const parsed = assignRolSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }

    const firmId = getFirmId(req, res);
    if (!firmId) return;

    // Security: if assigning a role, verify it belongs to this firm
    if (parsed.data.firmRolId !== null) {
      const rol = await storage.roles.getRol(parsed.data.firmRolId);
      if (!rol || rol.firmId !== firmId) {
        return res.status(400).json({ error: "El rol no pertenece a tu bufete" });
      }
    }

    const updated = await storage.lawyerFirmaHistory.setFirmRol(
      lawyerId,
      firmId,
      parsed.data.firmRolId
    );

    if (!updated) {
      return res.status(404).json({ error: "El abogado no es miembro activo de tu bufete" });
    }

    // Revoke the lawyer's active sessions so their next request picks up the
    // new firmRolId via the refresh flow (JWT update on next token refresh).
    const lawyerProfile = await storage.lawyerProfiles.getLawyer(lawyerId);
    if (lawyerProfile?.userId) {
      await storage.sessions.revokeAllForUser(lawyerProfile.userId);
    }

    res.json({ message: "Rol asignado correctamente", history: updated });
  } catch (err) {
    next(err);
  }
});

export default router;
