import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { authenticate } from "../../auth.js";
import { requireAdmin, requireAdminRole } from "../middleware/require-admin.js";
import { storage } from "../../storage/storeage/database-storage.js";

const router = Router();

router.use(authenticate, requireAdmin);

router.get("/overview", requireAdminRole("admin_super"), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [roles, permisos, modulos] = await Promise.all([
      storage.getLisRol(),
      storage.getPermisos(),
      storage.getModulos(),
    ]);

    const rolesWithPerms = await Promise.all(
      roles.map(async (rol: any) => ({
        ...rol,
        permisos: await storage.getPermisosByRol(rol.id),
      })),
    );

    res.json({ success: true, data: { roles: rolesWithPerms, permisos, modulos } });
  } catch (err) {
    next(err);
  }
});

router.get("/roles/:id", requireAdminRole("admin_super"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const roleId = Number(req.params.id);
    const [rol, assignedCodes, permisos] = await Promise.all([
      storage.getRol(roleId),
      storage.getPermisosByRol(roleId),
      storage.getPermisos(),
    ]);

    res.json({
      success: true,
      data: {
        rol,
        assignedCodes,
        permisos,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.put("/roles/:id/permisos", requireAdminRole("admin_super"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const roleId = Number(req.params.id);
    const { permisoIds } = z.object({ permisoIds: z.array(z.number().int().positive()) }).parse(req.body);
    await storage.permisos.assignPermisosToRol(roleId, permisoIds);
    const assignedCodes = await storage.getPermisosByRol(roleId);
    res.json({ success: true, data: { assignedCodes } });
  } catch (err) {
    next(err);
  }
});

export default router;
