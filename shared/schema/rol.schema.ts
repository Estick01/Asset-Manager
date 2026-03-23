import { mysqlTable, int, varchar, boolean, text, timestamp } from "drizzle-orm/mysql-core";

export const roles = mysqlTable("roles", {
  id: int("id").autoincrement().primaryKey(),
  nombre: varchar("nombre", { length: 50 }).notNull(),
  descripcion: text("descripcion"),
  activo: boolean("activo").notNull().default(true),
  /** NULL = rol global del sistema; firmId = rol personalizado de ese bufete */
  firmId: varchar("firm_id", { length: 36 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  state: boolean("state").notNull().default(true),
});

// ============================================
// Interfaces
// ============================================

/** Rol table row type */
export interface Rol {
  id: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  /** NULL = rol global del sistema; valor = rol personalizado del bufete con ese firmId */
  firmId: string | null;
  createdAt: Date;
  updatedAt: Date;
  state: boolean;
}

/** Rol insert type */
export interface InsertRol {
  id?: number;
  nombre: string;
  descripcion?: string | null;
  activo?: boolean;
  firmId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  state?: boolean;
}
