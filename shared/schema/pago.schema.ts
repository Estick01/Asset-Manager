/**
 * Pago Schema
 */
import { mysqlTable, varchar, decimal, timestamp, mysqlEnum } from "drizzle-orm/mysql-core";

export const pagos = mysqlTable("pagos", {
  id:                 varchar("id",          { length: 36  }).primaryKey(),
  suscripcionId:      varchar("suscripcion_id", { length: 36 }).notNull(),
  userId:             varchar("user_id",     { length: 36  }).notNull(),
  amountCop:          decimal("amount_cop",  { precision: 12, scale: 2 }),
  amountUsd:          decimal("amount_usd",  { precision: 10, scale: 2 }),
  currency:           mysqlEnum("currency",  ["COP", "USD"]).notNull(),
  metodoPago:         mysqlEnum("metodo_pago", ["card", "pse", "nequi", "bancolombia_transfer", "otro"]),
  estado:             mysqlEnum("estado", ["pendiente", "aprobado", "rechazado", "reembolsado"]).notNull().default("pendiente"),
  wompiTransactionId: varchar("wompi_transaction_id", { length: 100 }),
  wompiReference:     varchar("wompi_reference",      { length: 100 }).notNull().unique(),
  concepto:           varchar("concepto",    { length: 255 }),
  createdAt:          timestamp("created_at").notNull().defaultNow(),
});

export type Pago       = typeof pagos.$inferSelect;
export type InsertPago = typeof pagos.$inferInsert;
export type EstadoPago = "pendiente" | "aprobado" | "rechazado" | "reembolsado";
