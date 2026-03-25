/**
 * Tarea Observaciones
 * Notas/comentarios que se pueden agregar a una tarea en estado en_progreso.
 */

import { mysqlTable, varchar, text, timestamp } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";
import { tareas } from "./tarea.schema";

export const tareaObservaciones = mysqlTable("tarea_observaciones", {
  id:           varchar("id",           { length: 36 }).primaryKey(),
  tareaId:      varchar("tarea_id",     { length: 36 }).notNull(),
  autorId:      varchar("autor_id",     { length: 36 }).notNull(),
  autorNombre:  varchar("autor_nombre", { length: 255 }),
  contenido:    text("contenido").notNull(),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
});

export const tareaObservacionesRelations = relations(tareaObservaciones, ({ one }) => ({
  tarea: one(tareas, {
    fields: [tareaObservaciones.tareaId],
    references: [tareas.id],
  }),
}));

export type TareaObservacion       = typeof tareaObservaciones.$inferSelect;
export type InsertTareaObservacion = typeof tareaObservaciones.$inferInsert;

export interface TareaObservacionDTO {
  id:          string;
  tareaId:     string;
  autor:       { id: string; nombre: string };
  contenido:   string;
  createdAt:   Date;
}

export interface CreateObservacionDTO {
  contenido: string;
}
