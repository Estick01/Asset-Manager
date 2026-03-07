/**
 * TipoAsignacion Schema
 * Database table definition for tipo_asignacion (types of lawyer assignment to processes)
 */

import { relations } from "drizzle-orm";
import { mysqlTable, varchar, text, boolean, timestamp, int } from "drizzle-orm/mysql-core";

export const tipoAsignacion = mysqlTable("tipo_asignacion", {
  id: int("id").autoincrement().primaryKey(),
  nombre: varchar("nombre", { length: 100 }).notNull(),
  descripcion: text("descripcion"),
  color: varchar("color", { length: 7 }), // Hex color for UI
  activo: boolean("activo").notNull().default(true),
  fechaCreacion: timestamp("fecha_creacion").notNull().default(new Date()),
});

// ============================================
// Interfaces
// ============================================

/** TipoAsignacion table row type */
export interface TipoAsignacion {
  id: number;
  nombre: string;
  descripcion: string | null;
  color: string | null;
  activo: boolean;
  fechaCreacion: Date;
}

/** TipoAsignacion insert type */
export interface InsertTipoAsignacion {
  nombre: string;
  descripcion?: string | null;
  color?: string | null;
  activo?: boolean;
}
export const TIPO_ASIGNACION_IDS = {
  NUEVA_ASIGNACION: 1,
  REEMPLAZO: 2,
  ASISTENCIA: 3,
  DELEGACION: 4,
  SUPERVISION: 5,
  CONFLICTO_INTERES: 6,
  CARGA_TRABAJO: 7,
  SOLICITUD_CLIENTE: 8,
  ESPECIALIDAD: 9,
  TEMPORAL: 10,
  OTRO: 11,
} as const;

export type TipoAsignacionId = typeof TIPO_ASIGNACION_IDS[keyof typeof TIPO_ASIGNACION_IDS];

// Legacy aliases
export type InsertTipoAsignacionLegacy = typeof tipoAsignacion.$inferInsert;