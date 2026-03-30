/**
 * Feature Schema
 * Funcionalidades configurables por plan (sistema dinámico).
 */
import { mysqlTable, int, varchar, text, boolean } from "drizzle-orm/mysql-core";

// ── Catálogo de features ──────────────────────────────────────────────────────

export const features = mysqlTable("features", {
  id:          int("id").autoincrement().primaryKey(),
  code:        varchar("code",   { length: 100 }).notNull().unique(),
  nombre:      varchar("nombre", { length: 100 }).notNull(),
  descripcion: text("descripcion"),
  state:       boolean("state").notNull().default(true),
});

// ── Asignación de features a planes ──────────────────────────────────────────

export const planFeatures = mysqlTable("plan_features", {
  planId:      varchar("plan_id",      { length: 36  }).notNull(),
  featureCode: varchar("feature_code", { length: 100 }).notNull(),
  // "true" / "false" para boolean; "5" para límite numérico (ej: privados limitados)
  value:       varchar("value",        { length: 50  }).notNull().default("true"),
});

// ── Tipos inferidos ───────────────────────────────────────────────────────────

export type Feature        = typeof features.$inferSelect;
export type InsertFeature  = typeof features.$inferInsert;
export type PlanFeature    = typeof planFeatures.$inferSelect;

// ── Códigos de feature del sistema ───────────────────────────────────────────

export const FEATURE_CODES = [
  "calendario",
  "etapas_procesales",
  "comunidad",
  "chat",
  "privacidad_basica",       // hasta 5 clientes privados
  "privacidad_avanzada",     // privados ilimitados + procesos privados
  "dashboard_bufete",
  "roles_custom",
  "soporte_prioritario",
] as const;

export type FeatureCode = typeof FEATURE_CODES[number];
