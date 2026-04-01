// server/admin/middleware/require-admin.ts
import type { Request, Response, NextFunction } from "express";
import type { JWTPayload } from "@/shared/model.schema.js";

export const ADMIN_ROLES = ["admin_super", "admin_soporte", "admin_finanzas"] as const;
export type AdminRole = typeof ADMIN_ROLES[number];

/**
 * Bloquea cualquier request cuyo JWT no tenga un rol admin_*.
 * Usar DESPUÉS de `authenticate`.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const user = (req as any).user as JWTPayload;
  if (!user?.id) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }
  // JWTPayload.rol es un objeto Rol — usar .nombre para obtener el string
  if (!ADMIN_ROLES.includes(user.rol?.nombre as AdminRole)) {
    res.status(403).json({ error: "Acceso denegado: se requiere rol de administrador" });
    return;
  }
  next();
}

/**
 * Restringe a sub-roles específicos dentro del grupo admin.
 * Ej: requireAdminRole("admin_super", "admin_finanzas")
 */
export function requireAdminRole(...roles: AdminRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user as JWTPayload;
    // JWTPayload.rol es un objeto Rol — usar .nombre para obtener el string
    if (!roles.includes(user?.rol?.nombre as AdminRole)) {
      res.status(403).json({
        error: `Acceso denegado: se requiere ${roles.join(" o ")}`,
      });
      return;
    }
    next();
  };
}
