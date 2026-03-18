import { mysqlTable, int, timestamp } from "drizzle-orm/mysql-core";

export const rolesPermisos = mysqlTable("roles_permisos", {
  id: int("id").autoincrement().primaryKey(),
  rolId: int("rol_id").notNull(),
  permisoId: int("permiso_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

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
