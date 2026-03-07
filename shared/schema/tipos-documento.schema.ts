/**
 * Tipos Documento Schema
 * Database table definition for tipos_documento
 */

import { mysqlTable, varchar, boolean, int } from "drizzle-orm/mysql-core";

export const tiposDocumento = mysqlTable("tipos_documento", {
  id: int("id").autoincrement().primaryKey(),
  nombre: varchar("nombre", { length: 50 }).notNull(), // "Cédula", "Pasaporte", "NIT", etc.
  codigo: varchar("codigo", { length: 20 }).notNull().unique(), // "CC", "CE", "NIT", etc.
  state: boolean("state").notNull().default(true),
});

// ============================================
// Interfaces
// ============================================

/** TiposDocumento table row type */
export interface TiposDocumento {
  id: number;
  nombre: string;
  codigo: string;
  state: boolean;
}

/** TiposDocumento insert type */
export interface InsertTiposDocumento {
  id?: number;
  nombre: string;
  codigo: string;
  state?: boolean;
}
