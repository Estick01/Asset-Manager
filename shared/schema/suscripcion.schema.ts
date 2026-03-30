/**
 * Suscripcion Schema
 */
import { mysqlTable, varchar, int, boolean, datetime, timestamp, mysqlEnum } from "drizzle-orm/mysql-core";

export const suscripciones = mysqlTable("suscripciones", {
  id:                  varchar("id",       { length: 36 }).primaryKey(),
  userId:              varchar("user_id",  { length: 36 }).notNull(),
  planId:              varchar("plan_id",  { length: 36 }).notNull(),
  ciclo:               mysqlEnum("ciclo",  ["mensual", "anual"]).notNull(),
  estado:              mysqlEnum("estado", ["activa", "cancelada", "vencida", "en_prueba"]).notNull().default("activa"),
  fechaInicio:         datetime("fecha_inicio").notNull(),
  fechaVencimiento:    datetime("fecha_vencimiento").notNull(),
  fechaCancelacion:    datetime("fecha_cancelacion"),
  autoRenovacion:      boolean("auto_renovacion").notNull().default(true),
  extraUsers:          int("extra_users").notNull().default(0),
  wompiSubscriptionId: varchar("wompi_subscription_id", { length: 100 }),
  createdAt:           timestamp("created_at").notNull().defaultNow(),
});

export type Suscripcion       = typeof suscripciones.$inferSelect;
export type InsertSuscripcion = typeof suscripciones.$inferInsert;

export type CicloSuscripcion  = "mensual" | "anual";
export type EstadoSuscripcion = "activa" | "cancelada" | "vencida" | "en_prueba";

export interface SuscripcionConPlanDTO {
  suscripcion: Suscripcion;
  plan: import("./plane.schema").PlanPublicoDTO;
}
