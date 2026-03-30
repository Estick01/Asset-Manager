/**
 * Plane Schema — reestructurado para soportar planes por tipo (abogado/bufete),
 * precios en COP/USD, ciclos mensual/anual y límites por recurso.
 */
import { mysqlTable, varchar, int, decimal, boolean, mysqlEnum } from "drizzle-orm/mysql-core";

export const planes = mysqlTable("planes", {
  id:                       varchar("id",   { length: 36 }).primaryKey(),
  nombre:                   varchar("nombre", { length: 50 }).notNull(),
  tipo:                     mysqlEnum("tipo", ["abogado", "bufete"]).notNull(),
  // Precios
  precioMensualCop:         decimal("precio_mensual_cop", { precision: 12, scale: 2 }).notNull(),
  precioAnualCop:           decimal("precio_anual_cop",   { precision: 12, scale: 2 }).notNull(),
  precioMensualUsd:         decimal("precio_mensual_usd", { precision: 10, scale: 2 }).notNull(),
  precioAnualUsd:           decimal("precio_anual_usd",   { precision: 10, scale: 2 }).notNull(),
  // Límites de recursos (-1 = ilimitado)
  maxProcesos:              int("max_procesos").notNull().default(5),
  maxClientes:              int("max_clientes").notNull().default(10),
  maxStorageGb:             int("max_storage_gb").notNull().default(0),
  // Límites de usuarios (solo bufete; abogado siempre 1)
  includedUsers:            int("included_users").notNull().default(1),
  maxUsers:                 int("max_users").notNull().default(1),        // -1 = ilimitado
  precioUsuarioExtraCop:    decimal("precio_usuario_extra_cop", { precision: 10, scale: 2 }),
  precioUsuarioExtraUsd:    decimal("precio_usuario_extra_usd", { precision: 10, scale: 2 }),
  state:                    boolean("state").notNull().default(true),
});

export type Plan         = typeof planes.$inferSelect;
export type InsertPlan   = typeof planes.$inferInsert;

export interface PlanPublicoDTO {
  id:                    string;
  nombre:                string;
  tipo:                  "abogado" | "bufete";
  precioMensualCop:      string;
  precioAnualCop:        string;
  precioMensualUsd:      string;
  precioAnualUsd:        string;
  maxProcesos:           number;
  maxClientes:           number;
  maxStorageGb:          number;
  includedUsers:         number;
  maxUsers:              number;
  precioUsuarioExtraCop: string | null;
  precioUsuarioExtraUsd: string | null;
  features:              { code: string; nombre: string; value: string }[];
}
