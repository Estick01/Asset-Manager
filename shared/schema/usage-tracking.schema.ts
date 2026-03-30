/**
 * Usage Tracking Schema
 * Consumo real del usuario para validar límites del plan.
 */
import { mysqlTable, varchar, int, timestamp } from "drizzle-orm/mysql-core";

export const usageTracking = mysqlTable("usage_tracking", {
  id:              varchar("id",       { length: 36 }).primaryKey(),
  userId:          varchar("user_id",  { length: 36 }).notNull().unique(),
  suscripcionId:   varchar("suscripcion_id", { length: 36 }).notNull(),
  procesosUsados:  int("procesos_usados").notNull().default(0),
  clientesUsados:  int("clientes_usados").notNull().default(0),
  storageUsadoMb:  int("storage_usado_mb").notNull().default(0),
  updatedAt:       timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export type UsageTracking       = typeof usageTracking.$inferSelect;
export type InsertUsageTracking = typeof usageTracking.$inferInsert;

export interface UsageDTO {
  procesosUsados:  number;
  procesosMax:     number;   // -1 = ilimitado
  clientesUsados:  number;
  clientesMax:     number;
  storageUsadoMb:  number;
  storageMaxMb:    number;   // 0 = sin almacenamiento
}
