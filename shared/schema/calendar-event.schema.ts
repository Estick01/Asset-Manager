/**
 * Calendar Event Schema
 * Eventos manuales del abogado para el calendario.
 * El calendario agrega 3 fuentes: tareas + etapas procesales + estos eventos.
 */

import { relations } from "drizzle-orm";
import {
  mysqlTable,
  varchar,
  text,
  mysqlEnum,
  int,
  tinyint,
  datetime,
  timestamp,
} from "drizzle-orm/mysql-core";
import { lawyerProfiles } from "./lawyer-profile.schema";
import { procesos } from "./proceso.schema";

// ─────────────────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────────────────

export type CalendarEventType =
  | "audiencia"
  | "reunion_cliente"
  | "diligencia"
  | "vencimiento"
  | "otro";

/** Opciones de recordatorio en minutos */
export const REMINDER_OPTIONS = {
  EN_EL_MOMENTO: 0,
  QUINCE_MINUTOS: 15,
  UNA_HORA: 60,
  TRES_HORAS: 180,
  UN_DIA: 1440,
  TRES_DIAS: 4320,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Table
// ─────────────────────────────────────────────────────────────────────────────

export const calendarEvents = mysqlTable("calendar_events", {
  id:                  varchar("id",          { length: 36 }).primaryKey(),
  lawyerId:            varchar("lawyer_id",   { length: 36 }).notNull(),
  procesoId:           varchar("proceso_id",  { length: 36 }),
  titulo:              varchar("titulo",      { length: 255 }).notNull(),
  descripcion:         text("descripcion"),
  tipo:                mysqlEnum("tipo", [
                         "audiencia",
                         "reunion_cliente",
                         "diligencia",
                         "vencimiento",
                         "otro",
                       ]).notNull().default("otro"),
  fechaInicio:         datetime("fecha_inicio").notNull(),
  fechaFin:            datetime("fecha_fin"),                  // null = sin duración definida
  recordatorioMinutos: int("recordatorio_minutos").notNull().default(1440),
  notificado:          tinyint("notificado").notNull().default(0),
  state:               tinyint("state").notNull().default(1),
  createdAt:           timestamp("created_at").notNull().defaultNow(),
  updatedAt:           timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Relations
// ─────────────────────────────────────────────────────────────────────────────

export const calendarEventsRelations = relations(calendarEvents, ({ one }) => ({
  lawyer: one(lawyerProfiles, {
    fields: [calendarEvents.lawyerId],
    references: [lawyerProfiles.id],
  }),
  proceso: one(procesos, {
    fields: [calendarEvents.procesoId],
    references: [procesos.id],
  }),
}));

// ─────────────────────────────────────────────────────────────────────────────
// Inferred types
// ─────────────────────────────────────────────────────────────────────────────

export type CalendarEvent       = typeof calendarEvents.$inferSelect;
export type InsertCalendarEvent = typeof calendarEvents.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// DTOs
// ─────────────────────────────────────────────────────────────────────────────

/** Origen del evento (para distinguirlos en el frontend) */
export type CalendarEventSource = "manual" | "tarea" | "etapa";

/** Evento unificado que devuelve GET /api/calendar */
export interface CalendarEventDTO {
  id:           string;
  titulo:       string;
  descripcion:  string | null;
  tipo:         CalendarEventType | "tarea";
  source:       CalendarEventSource;
  fechaInicio:  Date;
  fechaFin:     Date | null;
  /** Color según tipo o urgencia */
  color:        string;
  /** Días restantes hasta fechaInicio (negativo = pasado) */
  diasRestantes: number;
  /** Proceso vinculado (para navegar desde el calendario) */
  proceso?: {
    id:       string;
    radicado: string;
    cliente:  string;
  } | null;
  /** Solo para eventos manuales */
  recordatorioMinutos?: number;
}

export interface CreateCalendarEventDTO {
  procesoId?:          string | null;
  titulo:              string;
  descripcion?:        string | null;
  tipo:                CalendarEventType;
  fechaInicio:         Date | string;
  fechaFin?:           Date | string | null;
  recordatorioMinutos?: number;
}

export interface UpdateCalendarEventDTO {
  titulo?:             string;
  descripcion?:        string | null;
  tipo?:               CalendarEventType;
  fechaInicio?:        Date | string;
  fechaFin?:           Date | string | null;
  recordatorioMinutos?: number;
}
