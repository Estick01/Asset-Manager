/**
 * Roles and Permissions Routes
 * 
 * Role and permission management endpoints.
 * Maintains backward compatibility with the original monolithic routes.
 */

import { Router, type Request, type Response, type NextFunction } from "express";
import { authenticate, requirePermission } from "../auth.js";
import { storage } from "../storage/storeage/database-storage.js";

const router = Router();

// GET /api/roles - Get all roles
router.get("/roles", authenticate, requirePermission("configuracion.ver"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rolesList = await storage.getLisRol();
    res.json(rolesList);
  } catch (err) {
    next(err);
  }
});

// GET /api/roles/:id - Get single role with permissions
router.get("/roles/:id", authenticate, requirePermission("configuracion.ver"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id.toString());
    if (isNaN(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }
    const rol = await storage.getRol(id);
    if (!rol) {
      return res.status(404).json({ error: "Rol no encontrado" });
    }
    const permisos = await storage.getPermisosByRol(id);
    res.json({ rol, permisos });
  } catch (err) {
    next(err);
  }
});

// POST /api/roles - Create new role
router.post("/roles", authenticate, requirePermission("configuracion.editar"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { z } = await import("zod");
    const createRolSchema = z.object({
      nombre:      z.string().min(1).max(100),
      descripcion: z.string().max(500).optional(),
    });
    const parsed = createRolSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }
    const { nombre, descripcion } = parsed.data;

    // Check if role name already exists
    const existing = await storage.getRolByNombre(nombre);
    if (existing) {
      return res.status(400).json({ error: "Ya existe un rol con este nombre" });
    }

    const created = await storage.createRol({ nombre, descripcion });
    res.status(201).json(created);
  } catch (err: any) {
    if (err.name === "ZodError") {
      return res.status(400).json({ error: "Datos inválidos", details: err.errors });
    }
    next(err);
  }
});

// DELETE /api/roles/:id - Delete role
router.delete("/roles/:id", authenticate, requirePermission("configuracion.editar"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const rolId = parseInt(Array.isArray(id) ? id[0] : id);
    
    if (isNaN(rolId)) {
      return res.status(400).json({ error: "ID de rol inválido" });
    }
    
    await storage.deleteRol(rolId);
    res.json({ message: "Rol eliminado correctamente" });
  } catch (err) {
    next(err);
  }
});

// GET /api/roles/:id/permisos - Get permissions for a role
router.get("/roles/:id/permisos", authenticate, requirePermission("configuracion.ver"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id.toString());
    if (isNaN(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }
    const permisos = await storage.getPermisosByRol(id);
    res.json(permisos);
  } catch (err) {
    next(err);
  }
});


// GET /api/permisos/all - Get all available permissions
router.get("/permisos/all", authenticate, requirePermission("configuracion.ver"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const permisos = await storage.getPermisos();
    res.json(permisos);
  } catch (err) {
    next(err);
  }
});

// GET /api/planes - Get all plans
router.get("/planes", authenticate, requirePermission("configuracion.ver"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const planes = await storage.getPlanes();
    res.json(planes);
  } catch (err) {
    next(err);
  }
});

// GET /api/modulos - Get all modules
router.get("/modulos", authenticate, requirePermission("configuracion.ver"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const modulos = await storage.getModulos();
    res.json(modulos);
  } catch (err) {
    next(err);
  }
});

// GET /api/lawyers - Get all lawyers
router.get("/lawyers", authenticate, requirePermission("usuarios.ver"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit, offset, search } = req.query;
    const limitNum = limit ? parseInt(limit as string, 10) : 10;
    const offsetNum = offset ? parseInt(offset as string, 10) : 0;
    const filter = search as string;

    const lawyers = await storage.getAllLawyers(limitNum, offsetNum, filter);
    res.json(lawyers);
  } catch (err) {
    next(err);
  }
});

// PUT /api/lawyers/:id/rol - Assign role to lawyer


// PUT /api/lawyers/:id/estado - Enable/disable lawyer account


// PUT /api/lawyers/:id/plan - Change lawyer plan


export default router;
