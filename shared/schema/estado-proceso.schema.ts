/**
 * Estado Proceso Schema
 * Database table definition for estados_proceso
 */

import { mysqlTable, varchar, boolean, timestamp, int } from "drizzle-orm/mysql-core";

export const estadosProceso = mysqlTable("estados_proceso", {
  id: int("id").autoincrement().primaryKey(),
  nombre: varchar("nombre", { length: 50 }).notNull(),
  codigo: varchar("codigo", { length: 50 }).notNull().unique(),
  color: varchar("color", { length: 20 }).notNull(), // ejemplo: #FF0000
  state: boolean("state").notNull().default(true), // activo / inactivo
  createdAt: timestamp("created_at").notNull().default(new Date()),
  updatedAt: timestamp("updated_at").notNull().default(new Date()).onUpdateNow(),
});

// ============================================
// Interfaces
// ============================================

/** EstadoProceso table row type */
export interface EstadoProceso {
  id?: number;
  nombre: string;
  codigo: string;
  color: string;
  state?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/** EstadoProceso insert type */
export interface InsertEstadoProceso {
  id?: number;
  nombre: string;
  codigo: string;
  color: string;
  state?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
