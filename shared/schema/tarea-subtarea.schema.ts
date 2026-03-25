/**
 * Tarea Subtareas
 * Sub-tareas vinculadas a una tarea principal.
 */

import { mysqlTable, varchar, text, mysqlEnum, decimal, int, timestamp } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";
import { tareas } from "./tarea.schema";

export type SubtareaEstado   = "pendiente" | "completada";
export type TiempoUnidad     = "minutos" | "horas" | "dias" | "semanas";

export const tareaSubtareas = mysqlTable("tarea_subtareas", {
  id:               varchar("id",                { length: 36 }).primaryKey(),
  tareaId:          varchar("tarea_id",          { length: 36 }).notNull(),
  titulo:           varchar("titulo",            { length: 255 }).notNull(),
  descripcion:      text("descripcion"),
  estado:           mysqlEnum("estado", ["pendiente", "completada"])
                      .notNull()
                      .default("pendiente"),
  tiempoEstimado:   decimal("tiempo_estimado", { precision: 6, scale: 1 }),
  tiempoUnidad:     mysqlEnum("tiempo_unidad", ["minutos", "horas", "dias", "semanas"]),
  completadaEn:     timestamp("completada_en"),
  completadaPorId:  varchar("completada_por_id", { length: 36 }),
  creadoPorId:      varchar("creado_por_id",      { length: 36 }).notNull(),
  creadoPorNombre:  varchar("creado_por_nombre",  { length: 255 }),
  orden:            int("orden").notNull().default(0),
  createdAt:        timestamp("created_at").notNull().defaultNow(),
  updatedAt:        timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export const tareaSubtareasRelations = relations(tareaSubtareas, ({ one }) => ({
  tarea: one(tareas, {
    fields: [tareaSubtareas.tareaId],
    references: [tareas.id],
  }),
}));

export type TareaSubtarea       = typeof tareaSubtareas.$inferSelect;
export type InsertTareaSubtarea = typeof tareaSubtareas.$inferInsert;

export interface SubtareaDTO {
  id:              string;
  tareaId:         string;
  titulo:          string;
  descripcion:     string | null;
  estado:          SubtareaEstado;
  tiempoEstimado:  number | null;
  tiempoUnidad:    TiempoUnidad | null;
  completadaEn:    Date | null;
  creadoPor:       { id: string; nombre: string };
  orden:           number;
  createdAt:       Date;
}

export interface CreateSubtareaDTO {
  titulo:         string;
  descripcion?:   string | null;
  tiempoEstimado?: number | null;
  tiempoUnidad?:   TiempoUnidad | null;
}

export interface UpdateSubtareaDTO {
  titulo?:        string;
  descripcion?:   string | null;
  estado?:        SubtareaEstado;
  tiempoEstimado?: number | null;
  tiempoUnidad?:   TiempoUnidad | null;
}
