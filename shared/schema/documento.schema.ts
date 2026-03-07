/**
 * Documento Schema
 * Database table definition for documentos
 */

import { relations } from "drizzle-orm";
import { mysqlTable, text, varchar, boolean, timestamp, int } from "drizzle-orm/mysql-core";
import { procesos } from "./proceso.schema";

export const documentos = mysqlTable("documentos", {
  id: varchar("id", { length: 36 }).primaryKey(),
  procesoId: varchar("proceso_id", { length: 36 }).notNull(),
  nombre: varchar("nombre", { length: 255 }).notNull(),
  url: text("url").notNull(),
  tipo: varchar("tipo", { length: 50 }).notNull(), // "demanda", "contestacion", "sentencia", etc.
  descripcion: text("descripcion"),
  fechaSubida: timestamp("fecha_subida").notNull().default(new Date()),
  state: boolean("state").notNull().default(true),
});

export const documentosRelations = relations(documentos, ({ one }) => ({
  proceso: one(procesos, {
    fields: [documentos.procesoId],
    references: [procesos.id],
  }),
}));

// ============================================
// Interfaces
// ============================================

/** Documento table row type */
export interface Documento {
  id: string;
  procesoId: string;
  nombre: string;
  url: string;
  tipo: string;
  descripcion: string | null;
  fechaSubida: Date;
  state: boolean;
  tamano: number;
}

/** Documento insert type */
export interface InsertDocumento {
  id: string;
  procesoId: string;
  nombre: string;
  url: string;
  tipo: string;
  descripcion?: string | null;
  fechaSubida?: Date;
  state?: boolean;
}

/** Documento relation types */
export interface DocumentoRelations {
  proceso: import("./proceso.schema").Proceso;
}
