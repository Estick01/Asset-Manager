/**
 * Legal Stage Schema
 * Etapas procesales jurídicas configurables por tipo de proceso
 */

import { mysqlTable, varchar, int, tinyint, timestamp } from "drizzle-orm/mysql-core";
import { tiposProceso } from "./tipo-proceso.schema";
import { relations } from "drizzle-orm";

// ─────────────────────────────────────────────────────────────────────────────
// Códigos de etapa estándar
// ─────────────────────────────────────────────────────────────────────────────

export const LEGAL_STAGE_CODES = [
  "PREPROCESS",         // Etapa preprocesal
  "FILED",              // Demanda presentada
  "ADMITTED",           // Demanda admitida
  "NOTIFIED",           // Demandado notificado
  "ANSWERED",           // Contestación de demanda
  "EVIDENCE",           // Etapa probatoria
  "HEARING",            // Audiencias
  "CLOSING_ARGUMENTS",  // Alegatos finales
  "JUDGMENT",           // Sentencia
  "APPEAL",             // Apelación (puede reabrir flujo)
  "ENFORCEMENT",        // Ejecución de sentencia
] as const;

export type LegalStageCode = typeof LEGAL_STAGE_CODES[number];

// ─────────────────────────────────────────────────────────────────────────────
// Table
// ─────────────────────────────────────────────────────────────────────────────

export const etapasPorTipoProceso = mysqlTable("etapas_por_tipo_proceso", {
  id:            int("id").autoincrement().primaryKey(),
  tipoProcesoId: int("tipo_proceso_id"),                          // NULL = aplica a todos
  codigo:        varchar("codigo",      { length: 50  }).notNull(),
  nombre:        varchar("nombre",      { length: 100 }).notNull(),
  descripcion:   varchar("descripcion", { length: 255 }),
  orden:         int("orden").notNull().default(0),
  diasLegales:   int("dias_legales").notNull().default(0),        // días hábiles del término
  color:         varchar("color",       { length: 20  }).notNull().default("#6B7280"),
  activo:        tinyint("activo").notNull().default(1),
  createdAt:     timestamp("created_at").notNull().defaultNow(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Relations
// ─────────────────────────────────────────────────────────────────────────────

export const etapasPorTipoProcesoRelations = relations(etapasPorTipoProceso, ({ one }) => ({
  tipoProceso: one(tiposProceso, {
    fields: [etapasPorTipoProceso.tipoProcesoId],
    references: [tiposProceso.id],
  }),
}));

// ─────────────────────────────────────────────────────────────────────────────
// Inferred types
// ─────────────────────────────────────────────────────────────────────────────

export type EtapaPorTipoProceso    = typeof etapasPorTipoProceso.$inferSelect;
export type InsertEtapaPorTipoProceso = typeof etapasPorTipoProceso.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// DTOs
// ─────────────────────────────────────────────────────────────────────────────

/** Etapa con info de vencimiento calculado para el proceso actual */
export interface EtapaProcesoDTO {
  id:           number;
  codigo:       LegalStageCode | string;
  nombre:       string;
  descripcion:  string | null;
  orden:        number;
  diasLegales:  number;
  color:        string;
  /** true si esta etapa ya fue superada */
  completada:   boolean;
  /** true si es la etapa actual del proceso */
  esActual:     boolean;
  /** fecha de vencimiento calculada para el proceso (solo en etapa actual) */
  fechaVencimiento?: Date | null;
  /** días restantes hasta el vencimiento (negativo = vencida) */
  diasRestantes?: number | null;
}

/** Respuesta del endpoint GET /api/legal-stages */
export interface LegalStagesResponseDTO {
  etapas:       EtapaProcesoDTO[];
  etapaActual:  EtapaProcesoDTO | null;
  siguienteEtapa: EtapaProcesoDTO | null;
}

/** Body del endpoint PATCH /api/procesos/:id/legal-stage */
export interface UpdateLegalStageDTO {
  legalStage:            LegalStageCode | string;
  fechaVencimientoEtapa?: Date | string | null;  // si no se envía, se calcula con diasLegales
}
