/**
 * Notificacion Schema
 * Database table definition for notificaciones
 */

import { mysqlTable, varchar, text, boolean, timestamp, int } from "drizzle-orm/mysql-core";

export const notificaciones = mysqlTable("notificaciones", {
  id: int("id").autoincrement().primaryKey(),
  procesoId: varchar("proceso_id", { length: 36 }).notNull(),
  /** Target client — nullable when notification targets a lawyer or firm only */
  clienteId: varchar("cliente_id", { length: 36 }),
  /** Target lawyer — nullable when notification targets a client or firm only */
  lawyerId: varchar("lawyer_id", { length: 36 }),
  /** Target firm — nullable when notification targets a client or lawyer only */
  firmId: varchar("firm_id", { length: 36 }),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  mensaje: text("mensaje").notNull(),
  tipo: varchar("tipo", { length: 50 }).notNull().default("estado_cambio"),
  leidoCliente: boolean("leido_cliente").notNull().default(false),
  leidoLawyer: boolean("leido_lawyer").notNull().default(false),
  leidoFirma: boolean("leido_firma").notNull().default(false),
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
  clienteId: string | null;
  lawyerId: string | null;
  firmId: string | null;
  titulo: string;
  mensaje: string;
  tipo: string;
  leidoCliente: boolean;
  leidoLawyer: boolean;
  leidoFirma: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Notificacion insert type */
export interface InsertNotificacion {
  id?: number;
  procesoId: string;
  clienteId?: string | null;
  lawyerId?: string | null;
  firmId?: string | null;
  titulo: string;
  mensaje: string;
  tipo?: string;
  leidoCliente?: boolean;
  leidoLawyer?: boolean;
  leidoFirma?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
