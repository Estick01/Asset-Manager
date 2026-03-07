/**
 * Notificacion Schema
 * Database table definition for notificaciones
 */

import { mysqlTable, varchar, text, boolean, timestamp, int } from "drizzle-orm/mysql-core";

export const notificaciones = mysqlTable("notificaciones", {
  id: int("id").autoincrement().primaryKey(),
  procesoId: varchar("proceso_id", { length: 36 }).notNull(),
  clienteId: varchar("cliente_id", { length: 36 }).notNull(),
  lawyerId: varchar("lawyer_id", { length: 36 }).notNull(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  mensaje: text("mensaje").notNull(),
  tipo: varchar("tipo", { length: 50 }).notNull().default("estado_cambio"),
  leidoCliente: boolean("leido_cliente").notNull().default(false),
  leidoLawyer: boolean("leido_lawyer").notNull().default(false),
  createdAt: timestamp("created_at").notNull().default(new Date()),
  updatedAt: timestamp("updated_at").notNull().default(new Date()).onUpdateNow(),
});

// ============================================
// Interfaces
// ============================================

/** Notificacion table row type */
export interface Notificacion {
  id: number;
  procesoId: string;
  clienteId: string;
  lawyerId: string;
  titulo: string;
  mensaje: string;
  tipo: string;
  leidoCliente: boolean;
  leidoLawyer: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Notificacion insert type */
export interface InsertNotificacion {
  id?: number;
  procesoId: string;
  clienteId: string;
  lawyerId: string;
  titulo: string;
  mensaje: string;
  tipo?: string;
  leidoCliente?: boolean;
  leidoLawyer?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
