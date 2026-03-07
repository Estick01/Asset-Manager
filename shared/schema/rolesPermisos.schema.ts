import { mysqlTable, int, timestamp } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";
import { permisos } from "./permiso.schema";
import { roles } from "./rol.schema";


export const rolesPermisos = mysqlTable("roles_permisos", {
  id: int("id").autoincrement().primaryKey(),
  rolId: int("rol_id").notNull(),
  permisoId: int("permiso_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const rolesPermisosRelations = relations(rolesPermisos, ({ one }) => ({
  rol: one(roles, { fields: [rolesPermisos.rolId], references: [roles.id] }),
  permiso: one(permisos, { fields: [rolesPermisos.permisoId], references: [permisos.id] }),
}));

// ============================================
// Interfaces
// ============================================

/** RolPermiso table row type */
export interface RolPermiso {
  id: number;
  rolId: number;
  permisoId: number;
  createdAt: Date;
}

/** RolPermiso insert type */
export interface InsertRolPermiso {
  id?: number;
  rolId: number;
  permisoId: number;
  createdAt?: Date;
}
