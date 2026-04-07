// shared/schema/proceso-etapa-historial.schema.ts
import { mysqlTable, varchar, text, timestamp } from "drizzle-orm/mysql-core";
import { procesos } from "./proceso.schema";
import { users } from "./user.schema";
import { relations } from "drizzle-orm";

// ─────────────────────────────────────────────────────────────────────────────
// Estados posibles dentro de una etapa
// ─────────────────────────────────────────────────────────────────────────────

export const ETAPA_ESTADOS = [
  "INICIADA",        // Etapa iniciada
  "EN_PROCESO",      // En proceso de ejecución
  "COMPLETADA",      // Completada exitosamente
  "NO_ADMITIDA",     // Rechazada/no admitida
  "SUBSANADA",       // Subsanada después de rechazo
  "FALLIDA",         // Falló (ej: notificación fallida)
  "REINTENTO",       // Reintento después de falla
  "APLAZADA",        // Aplazada (ej: audiencia)
  "CANCELADA",       // Cancelada
  "SUSPENDIDA",      // Suspendida temporalmente
] as const;

export type EtapaEstado = typeof ETAPA_ESTADOS[number];

// ─────────────────────────────────────────────────────────────────────────────
// Table: proceso_etapa_historial
// ─────────────────────────────────────────────────────────────────────────────

export const procesoEtapaHistorial = mysqlTable("proceso_etapa_historial", {
  id:         varchar("id",          { length: 36 }).primaryKey(),
  procesoId:  varchar("proceso_id",  { length: 36 }).notNull(),
  etapa:      varchar("etapa",       { length: 50  }).notNull(), // Código de la etapa (ej: "DEMANDA", "NOTIFICACION")
  estado:     varchar("estado",      { length: 20  }).notNull(), // Estado dentro de la etapa
  fecha:      timestamp("fecha").notNull().defaultNow(),
  observacion: text("observacion"),                               // Observaciones opcionales
  usuarioId:  varchar("usuario_id", { length: 36 }),             // Usuario que realizó el cambio
  createdAt:  timestamp("created_at").notNull().defaultNow(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Relations
// ─────────────────────────────────────────────────────────────────────────────

export const procesoEtapaHistorialRelations = relations(procesoEtapaHistorial, ({ one }) => ({
  proceso: one(procesos, {
    fields: [procesoEtapaHistorial.procesoId],
    references: [procesos.id],
  }),
  usuario: one(users, {
    fields: [procesoEtapaHistorial.usuarioId],
    references: [users.id],
  }),
}));

// ─────────────────────────────────────────────────────────────────────────────
// Inferred types
// ─────────────────────────────────────────────────────────────────────────────

export type ProcesoEtapaHistorial       = typeof procesoEtapaHistorial.$inferSelect;
export type InsertProcesoEtapaHistorial = typeof procesoEtapaHistorial.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// DTOs
// ─────────────────────────────────────────────────────────────────────────────

export interface ProcesoEtapaHistorialDTO {
  id:          string;
  procesoId:   string;
  etapa:       string;
  estado:      EtapaEstado;
  fecha:       Date;
  observacion: string | null;
  usuarioId:   string | null;
  createdAt:   Date;
}

export interface CreateProcesoEtapaHistorialDTO {
  etapa:       string;
  estado:      EtapaEstado;
  observacion?: string;
}