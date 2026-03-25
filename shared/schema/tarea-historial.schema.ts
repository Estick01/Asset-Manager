/**
 * Tarea Historial
 * Registro de auditoría de todas las acciones realizadas sobre una tarea.
 */

import { mysqlTable, varchar, text, timestamp } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";
import { tareas } from "./tarea.schema";

export type TareaAccion =
  | "creada"
  | "actualizada"
  | "estado_cambiado"
  | "observacion_agregada"
  | "subtarea_agregada"
  | "subtarea_completada"
  | "archivo_adjuntado";

export const tareaHistorial = mysqlTable("tarea_historial", {
  id:            varchar("id",             { length: 36 }).primaryKey(),
  tareaId:       varchar("tarea_id",       { length: 36 }).notNull(),
  usuarioId:     varchar("usuario_id",     { length: 36 }).notNull(),
  usuarioNombre: varchar("usuario_nombre", { length: 255 }),
  accion:        varchar("accion",         { length: 50  }).notNull(),
  detalle:       text("detalle"),
  createdAt:     timestamp("created_at").notNull().defaultNow(),
});

export const tareaHistorialRelations = relations(tareaHistorial, ({ one }) => ({
  tarea: one(tareas, {
    fields: [tareaHistorial.tareaId],
    references: [tareas.id],
  }),
}));

export type TareaHistorialEntry       = typeof tareaHistorial.$inferSelect;
export type InsertTareaHistorialEntry = typeof tareaHistorial.$inferInsert;

export interface TareaHistorialDTO {
  id:            string;
  tareaId:       string;
  usuario:       { id: string; nombre: string };
  accion:        TareaAccion;
  detalle:       string | null;
  createdAt:     Date;
}
