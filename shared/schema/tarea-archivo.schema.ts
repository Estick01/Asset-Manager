/**
 * Tarea Archivos
 * Archivos (imágenes, PDFs, etc.) adjuntos a una tarea.
 */

import { mysqlTable, varchar, int, text, timestamp } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";
import { tareas } from "./tarea.schema";

export const tareaArchivos = mysqlTable("tarea_archivos", {
  id:           varchar("id",           { length: 36  }).primaryKey(),
  tareaId:      varchar("tarea_id",     { length: 36  }).notNull(),
  nombre:       varchar("nombre",       { length: 255 }).notNull(),
  url:          text("url").notNull(),                  // S3 key or local path
  mimeType:     varchar("mime_type",    { length: 100 }).notNull(),
  tamano:       int("tamano").notNull().default(0),     // bytes
  subidoPorId:  varchar("subido_por_id",{ length: 36  }).notNull(),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
});

export const tareaArchivosRelations = relations(tareaArchivos, ({ one }) => ({
  tarea: one(tareas, {
    fields: [tareaArchivos.tareaId],
    references: [tareas.id],
  }),
}));

export type TareaArchivo       = typeof tareaArchivos.$inferSelect;
export type InsertTareaArchivo = typeof tareaArchivos.$inferInsert;

export interface TareaArchivoDTO {
  id:          string;
  tareaId:     string;
  nombre:      string;
  url:         string;         // S3 key — use /download endpoint
  mimeType:    string;
  tamano:      number;
  esImagen:    boolean;
  subidoPorId: string;
  createdAt:   Date;
}
