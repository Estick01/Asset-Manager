import { relations } from "drizzle-orm";
import {
  mysqlTable,
  varchar,
  text,
  mysqlEnum,
  int,
  date,
  timestamp,
  boolean,
} from "drizzle-orm/mysql-core";
import { procesos } from "./proceso.schema";
import { lawyerProfiles } from "./lawyer-profile.schema";

// ─────────────────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────────────────

export type TareaEstado = "pendiente" | "en_progreso" | "completada" | "cancelada";
export type TareaPrioridad = "baja" | "media" | "alta" | "urgente";

// ─────────────────────────────────────────────────────────────────────────────
// Table
// ─────────────────────────────────────────────────────────────────────────────

export const tareas = mysqlTable("tareas", {
  id:                varchar("id",                  { length: 36 }).primaryKey(),
  procesoId:         varchar("proceso_id",          { length: 36 }).notNull(),

  titulo:            varchar("titulo",              { length: 255 }).notNull(),
  descripcion:       text("descripcion"),

  estado:            mysqlEnum("estado", ["pendiente", "en_progreso", "completada", "cancelada"])
                       .notNull()
                       .default("pendiente"),

  prioridad:         mysqlEnum("prioridad", ["baja", "media", "alta", "urgente"])
                       .notNull()
                       .default("media"),

  fechaLimite:       date("fecha_limite", { mode: "date" }),
  fechaCompletada:   timestamp("fecha_completada"),

  /** FK al perfil del abogado asignado (puede ser null) */
  asignadoA:         varchar("asignado_a",          { length: 36 }),
  /** Nombre desnormalizado para evitar joins en listados */
  asignadoANombre:   varchar("asignado_a_nombre",   { length: 255 }),

  /** FK al perfil del abogado que creó la tarea */
  creadoPor:         varchar("creado_por",          { length: 36 }).notNull(),
  /** Nombre desnormalizado */
  creadoPorNombre:   varchar("creado_por_nombre",   { length: 255 }),

  /** Posición para drag & drop futuro */
  orden:             int("orden").notNull().default(0),

  state:             boolean("state").notNull().default(true),

  createdAt:         timestamp("created_at").notNull().defaultNow(),
  updatedAt:         timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Relations
// ─────────────────────────────────────────────────────────────────────────────

export const tareasRelations = relations(tareas, ({ one }) => ({
  proceso: one(procesos, {
    fields: [tareas.procesoId],
    references: [procesos.id],
  }),
  asignado: one(lawyerProfiles, {
    fields: [tareas.asignadoA],
    references: [lawyerProfiles.id],
    relationName: "tareas_asignado",
  }),
  creador: one(lawyerProfiles, {
    fields: [tareas.creadoPor],
    references: [lawyerProfiles.id],
    relationName: "tareas_creador",
  }),
}));

// ─────────────────────────────────────────────────────────────────────────────
// Inferred types
// ─────────────────────────────────────────────────────────────────────────────

export type Tarea = typeof tareas.$inferSelect;
export type InsertTarea = typeof tareas.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// DTOs
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateTareaDTO {
  titulo: string;
  descripcion?: string | null;
  prioridad?: TareaPrioridad;
  fechaLimite?: Date | string | null;
  asignadoA?: string | null;
}

export interface UpdateTareaDTO {
  titulo?: string;
  descripcion?: string | null;
  prioridad?: TareaPrioridad;
  fechaLimite?: Date | string | null;
  asignadoA?: string | null;
}

export interface CambiarEstadoDTO {
  estado: TareaEstado;
}

export interface TareaResponseDTO {
  id: string;
  procesoId: string;
  titulo: string;
  descripcion: string | null;
  estado: TareaEstado;
  prioridad: TareaPrioridad;
  fechaLimite: Date | null;
  fechaCompletada: Date | null;
  asignado: { id: string; nombre: string } | null;
  creadoPor: { id: string; nombre: string };
  orden: number;
  vencida: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TareasProgresoDTO {
  tareas: TareaResponseDTO[];
  progreso: {
    total: number;
    completadas: number;
    porcentaje: number;
  };
}

export interface MisTareasDTO {
  pendientes: TareaResponseDTO[];
  en_progreso: TareaResponseDTO[];
  vencidas: TareaResponseDTO[];
  completadas: TareaResponseDTO[];
}
