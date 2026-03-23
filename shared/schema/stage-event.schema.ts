// shared/schema/stage-event.schema.ts
import { mysqlTable, varchar, text, mysqlEnum, json, timestamp } from "drizzle-orm/mysql-core";
import { procesos } from "./proceso.schema";
import { relations } from "drizzle-orm";

export type StageEventTipo =
  | "etapa_iniciada"
  | "etapa_completada"
  | "tarea_completada"
  | "documento_subido"
  | "nota";

export const etapaEventos = mysqlTable("etapa_eventos", {
  id:             varchar("id",               { length: 36 }).primaryKey(),
  procesoId:      varchar("proceso_id",       { length: 36 }).notNull(),
  legalStageCode: varchar("legal_stage_code", { length: 50  }).notNull(),
  tipo:           mysqlEnum("tipo", [
    "etapa_iniciada", "etapa_completada",
    "tarea_completada", "documento_subido", "nota",
  ]).notNull(),
  descripcion:    text("descripcion").notNull(),
  metadatos:      json("metadatos"),
  creadoPor:      varchar("creado_por", { length: 36 }),
  createdAt:      timestamp("created_at").notNull().defaultNow(),
});

export const etapaEventosRelations = relations(etapaEventos, ({ one }) => ({
  proceso: one(procesos, {
    fields: [etapaEventos.procesoId],
    references: [procesos.id],
  }),
}));

export type EtapaEvento       = typeof etapaEventos.$inferSelect;
export type InsertEtapaEvento = typeof etapaEventos.$inferInsert;

export interface StageEventResponseDTO {
  id:             string;
  procesoId:      string;
  legalStageCode: string;
  tipo:           StageEventTipo;
  descripcion:    string;
  metadatos:      Record<string, unknown> | null;
  creadoPor:      string | null;
  createdAt:      Date;
}
