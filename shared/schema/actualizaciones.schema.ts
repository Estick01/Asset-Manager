import { mysqlTable, varchar, text, int, timestamp, boolean } from "drizzle-orm/mysql-core";
import { relations, sql } from "drizzle-orm";
import { procesos } from "./proceso.schema";
import { tiposActualizacion } from "./tipos-actualizacion.schema";
import { documentos } from "./documento.schema";


// Tabla de Actualizaciones
export const actualizaciones = mysqlTable("actualizaciones", {
  id: varchar("id", { length: 36 }).primaryKey(),
  procesoId: varchar("proceso_id", { length: 36 }).notNull(),
  fecha: timestamp("fecha").notNull().default(sql`now()`),
  titulo: text("titulo").notNull(),
  descripcion: text("descripcion").notNull(),
  tipoId: int("tipo_id").notNull(), // FK to tipos_actualizacion
  documentoId: varchar("documento_id", { length: 36 }), // Nullable
  state: boolean("state").notNull().default(true),
});

export const actualizacionesRelations = relations(actualizaciones, ({ one }) => ({
  proceso: one(procesos, { fields: [actualizaciones.procesoId], references: [procesos.id] }),
  tipo: one(tiposActualizacion, { fields: [actualizaciones.tipoId], references: [tiposActualizacion.id] }),
  documento: one(documentos, { fields: [actualizaciones.documentoId], references: [documentos.id] }),
}));

// ============================================
// Interfaces
// ============================================

/** Actualizacion table row type */
export interface Actualizacion {
  id: string;
  procesoId: string;
  fecha: Date;
  titulo: string;
  descripcion: string;
  tipoId: number;
  documentoId: string | null;
  state: boolean;
}

/** Actualizacion insert type */
export interface InsertActualizacion {
  id?: string;
  procesoId: string;
  fecha?: Date;
  titulo: string;
  descripcion: string;
  tipoId: number;
  documentoId?: string | null;
  state?: boolean;
  tipo:string
}

/** Actualizacion relation types */
export interface ActualizacionRelations extends Actualizacion {
  proceso: import("./proceso.schema").Proceso;
  tipo: import("./tipos-actualizacion.schema").TipoActualizacion;
  documento: import("./documento.schema").Documento | null;
}

// Legacy types for backward compatibility
export type ActualizacionLegacy = typeof actualizaciones.$inferSelect;
export type InsertActualizacionLegacy = typeof actualizaciones.$inferInsert;
