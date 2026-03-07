import { mysqlTable, int, varchar, text, boolean, timestamp } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";
import { permisos } from "./permiso.schema";


export const modulos = mysqlTable("modulos", {
  id: int("id").autoincrement().primaryKey(),
  nombre: varchar("nombre", { length: 50 }).notNull().unique(),
  descripcion: text("descripcion"),
  icono: varchar("icono", { length: 50 }),
  orden: int("orden").default(0),
  activo: boolean("activo").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  state: boolean("state").notNull().default(true),
});

export const modulosRelations = relations(modulos, ({ many }) => ({
  permisos: many(permisos),
}));

// ============================================
// Interfaces
// ============================================

/** Modulo table row type */
export interface Modulo {
  id: number;
  nombre: string;
  descripcion: string | null;
  icono: string | null;
  orden: number;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
  state: boolean;
}

/** Modulo insert type */
export interface InsertModulo {
  id?: number;
  nombre: string;
  descripcion?: string | null;
  icono?: string | null;
  orden?: number;
  activo?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  state?: boolean;
}
