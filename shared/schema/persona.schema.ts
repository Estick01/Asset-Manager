/**
 * Persona Schema
 * Base table for natural persons — shared by clientes_natural, lawyer_profiles, representantes_legales
 */

import { relations } from "drizzle-orm";
import { mysqlTable, varchar, text, int, uniqueIndex } from "drizzle-orm/mysql-core";
import { tiposDocumento } from "./tipos-documento.schema";
import { departamentos, municipios } from "./ubicacion.schema";

export const personas = mysqlTable("personas", {
  id: varchar("id", { length: 36 }).primaryKey(),
  nombre: varchar("nombre", { length: 100 }).notNull(),
  apellido: varchar("apellido", { length: 100 }).notNull(),
  telefono: varchar("telefono", { length: 50 }).notNull(),
  documento: varchar("documento", { length: 50 }).notNull(),
  tipoDocumentoId: int("tipo_documento_id").notNull(),
  direccion: text("direccion"),
  departamentoId: varchar("departamento_id", { length: 36 }),
  municipioId: varchar("municipio_id", { length: 36 }),
}, (table) => ({
  documentoUnique: uniqueIndex("personas_documento_unique").on(table.documento),
}));

export const personasRelations = relations(personas, ({ one }) => ({
  tipoDocumento: one(tiposDocumento, {
    fields: [personas.tipoDocumentoId],
    references: [tiposDocumento.id],
  }),
  departamento: one(departamentos, {
    fields: [personas.departamentoId],
    references: [departamentos.id],
  }),
  municipio: one(municipios, {
    fields: [personas.municipioId],
    references: [municipios.id],
  }),
}));

// ============================================
// Interfaces
// ============================================

export interface Persona {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string;
  documento: string;
  tipoDocumentoId: number;
  direccion: string | null;
  departamentoId: string | null;
  municipioId: string | null;
  tipoDocumento?: { id: number; codigo: string; nombre: string } | null;
  departamento?: { id: string; codigo: string; nombre: string } | null;
  municipio?: { id: string; codigo: string; nombre: string } | null;
}

export interface InsertPersona {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string;
  documento: string;
  tipoDocumentoId: number;
  direccion?: string | null;
  departamentoId?: string | null;
  municipioId?: string | null;
}
