import { mysqlTable, int, varchar, text, boolean, timestamp } from "drizzle-orm/mysql-core";

export const permisos = mysqlTable("permisos", {
  id: int("id").autoincrement().primaryKey(),
  codigo: varchar("codigo", { length: 100 }).notNull().unique(),
  nombre: varchar("nombre", { length: 100 }).notNull(),
  descripcion: text("descripcion"),
  moduloId: int("modulo_id"),
  activo: boolean("activo").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  state: boolean("state").notNull().default(true),
});

// ============================================
// Interfaces
// ============================================

/** Permiso table row type */
export interface Permiso {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  moduloId: number | null;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
  state: boolean;
}

/** Permiso insert type */
export interface InsertPermiso {
  id?: number;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  moduloId?: number | null;
  activo?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  state?: boolean;
}
