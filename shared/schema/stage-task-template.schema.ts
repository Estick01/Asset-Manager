// shared/schema/stage-task-template.schema.ts
import { mysqlTable, int, varchar, text, mysqlEnum, tinyint, timestamp } from "drizzle-orm/mysql-core";
import { tiposProceso } from "./tipo-proceso.schema";
import { relations } from "drizzle-orm";
import type { TareaPrioridad } from "./tarea.schema";

export const etapasTareasPlantilla = mysqlTable("etapa_tareas_plantilla", {
  id:              int("id").autoincrement().primaryKey(),
  tipoProcesoId:   int("tipo_proceso_id"),
  legalStageCode:  varchar("legal_stage_code", { length: 50 }).notNull(),
  titulo:          varchar("titulo",           { length: 255 }).notNull(),
  descripcion:     text("descripcion"),
  prioridad:       mysqlEnum("prioridad", ["baja", "media", "alta", "urgente"]).notNull().default("media"),
  requerida:       tinyint("requerida").notNull().default(0),
  orden:           int("orden").notNull().default(0),
  activo:          tinyint("activo").notNull().default(1),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
});

export const etapasTareasPlantillaRelations = relations(etapasTareasPlantilla, ({ one }) => ({
  tipoProceso: one(tiposProceso, {
    fields: [etapasTareasPlantilla.tipoProcesoId],
    references: [tiposProceso.id],
  }),
}));

export type EtapaTareaPlantilla       = typeof etapasTareasPlantilla.$inferSelect;
export type InsertEtapaTareaPlantilla = typeof etapasTareasPlantilla.$inferInsert;

export interface CreateTemplateDTO {
  tipoProcesoId?: number | null;
  legalStageCode: string;
  titulo:         string;
  descripcion?:   string | null;
  prioridad?:     TareaPrioridad;
  requerida?:     boolean;
  orden?:         number;
}

export interface UpdateTemplateDTO {
  titulo?:       string;
  descripcion?:  string | null;
  prioridad?:    TareaPrioridad;
  requerida?:    boolean;
  orden?:        number;
  activo?:       boolean;
}

export interface TemplateResponseDTO {
  id:             number;
  tipoProcesoId:  number | null;
  legalStageCode: string;
  titulo:         string;
  descripcion:    string | null;
  prioridad:      TareaPrioridad;
  requerida:      boolean;
  orden:          number;
  activo:         boolean;
}
