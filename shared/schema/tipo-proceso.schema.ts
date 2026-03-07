/**
 * Tipo Proceso Schema
 * Database table definition for tipos_proceso
 */

import { mysqlTable, varchar, text, boolean, timestamp, int } from "drizzle-orm/mysql-core";

export const tiposProceso = mysqlTable("tipos_proceso", {
  id: int("id").autoincrement().primaryKey(),
  nombre: varchar("nombre", { length: 100 }).notNull(),
  descripcion: text("descripcion"),
  activo: boolean("activo").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(new Date()),
  updatedAt: timestamp("updated_at").notNull().default(new Date()).onUpdateNow(),
});

// ============================================
// Interfaces
// ============================================

/** TiposProceso table row type */
export interface TiposProceso {
  id: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** TiposProceso insert type */
export interface InsertTiposProceso {
  id?: number;
  nombre: string;
  descripcion?: string | null;
  activo?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
