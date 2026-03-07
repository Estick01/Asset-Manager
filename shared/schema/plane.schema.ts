/**
 * Plane Schema
 * Database table definition for planes (plans)
 */

import { mysqlTable, varchar, text, boolean, decimal } from "drizzle-orm/mysql-core";

export const planes = mysqlTable("planes", {
  id: varchar("id", { length: 36 }).primaryKey(),
  nombre: varchar("nombre", { length: 50 }).notNull(),
  precio: decimal("precio", { precision: 10, scale: 2 }).notNull(),
  caracteristicas: text("caracteristicas").notNull(),
  state: boolean("state").notNull().default(true),
});

// ============================================
// Interfaces
// ============================================

/** Plan table row type */
export interface Plan {
  id: string;
  nombre: string;
  precio: string;
  caracteristicas: string;
  state: boolean;
}

/** Plan insert type */
export interface InsertPlan {
  id: string;
  nombre: string;
  precio: string;
  caracteristicas: string;
  state?: boolean;
}
