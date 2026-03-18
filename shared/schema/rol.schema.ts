import { mysqlTable, int, varchar, boolean, text, timestamp } from "drizzle-orm/mysql-core";

export const roles = mysqlTable("roles", {
  id: int("id").autoincrement().primaryKey(),
  nombre: varchar("nombre", { length: 50 }).notNull().unique(),
  descripcion: text("descripcion"),
  activo: boolean("activo").notNull().default(true),
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
  createdAt?: Date;
  updatedAt?: Date;
  state?: boolean;
}
