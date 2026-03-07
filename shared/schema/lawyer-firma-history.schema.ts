/**
 * LawyerFirmaHistory Schema
 * Database table definition for lawyer_firma_history
 * Tracks the history of lawyers in firms (bufetes)
 */

import { relations } from "drizzle-orm";
import { mysqlTable, varchar, timestamp, text } from "drizzle-orm/mysql-core";
import { lawyerProfiles } from "./lawyer-profile.schema";
import { firmProfiles } from "./firm-profile.schema";
import { users } from "./user.schema";

export const lawyerFirmaHistory = mysqlTable("lawyer_firma_history", {
  id: varchar("id", { length: 36 }).primaryKey(),
  lawyerId: varchar("lawyer_id", { length: 36 }).notNull(),
  firmaId: varchar("firma_id", { length: 36 }).notNull(),
  fechaIngreso: timestamp("fecha_ingreso").notNull().defaultNow(),
  fechaSalida: timestamp("fecha_salida"), // null = firma actual
  motivoSalida: varchar("motivo_salida", { length: 255 }),
  estado: varchar("estado", { length: 20 }).notNull().default("activo"), // "activo" | "retirado" | "suspendido" | "transferido"
  createdBy: varchar("created_by", { length: 36 }),
  notas: text("notas"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const lawyerFirmaHistoryRelations = relations(lawyerFirmaHistory, ({ one }) => ({
  lawyer: one(lawyerProfiles, {
    fields: [lawyerFirmaHistory.lawyerId],
    references: [lawyerProfiles.id],
  }),
  firma: one(firmProfiles, {
    fields: [lawyerFirmaHistory.firmaId],
    references: [firmProfiles.id],
  }),
  creadoPor: one(users, {
    fields: [lawyerFirmaHistory.createdBy],
    references: [users.id],
  }),
}));

// ============================================
// Interfaces
// ============================================

/** LawyerFirmaHistory table row type */
export interface LawyerFirmaHistory {
  id: string;
  lawyerId: string;
  firmaId: string;
  fechaIngreso: Date;
  fechaSalida: Date | null;
  motivoSalida: string | null;
  estado: string; // "activo" | "retirado" | "suspendido" | "transferido"
  createdBy: string | null;
  notas: string | null;
  createdAt: Date;
}

/** LawyerFirmaHistory insert type */
export interface InsertLawyerFirmaHistory {
  id?: string;
  lawyerId: string;
  firmaId: string;
  fechaIngreso?: Date;
  fechaSalida?: Date | null;
  motivoSalida?: string | null;
  estado?: string;
  createdBy?: string | null;
  notas?: string | null;
}
