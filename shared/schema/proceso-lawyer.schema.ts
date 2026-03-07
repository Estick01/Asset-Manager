/**
 * ProcesoLawyer Schema
 * Database table definition for proceso_lawyers (junction table between procesos and lawyers)
 */

import { relations } from "drizzle-orm";
import { mysqlTable, varchar, timestamp, int } from "drizzle-orm/mysql-core";
import { procesos } from "./proceso.schema";
import { lawyerProfiles } from "./lawyer-profile.schema";
import { users } from "./user.schema";
import { tipoAsignacion } from "./tipo-asignacion.schema";

export const procesoLawyers = mysqlTable("proceso_lawyers", {
  id: varchar("id", { length: 36 }).primaryKey(),
  procesoId: varchar("proceso_id", { length: 36 }).notNull(),
  lawyerId: varchar("lawyer_id", { length: 36 }).notNull(),
  tipoAsignacionId: int("tipo_asignacion_id"), // FK to tipo_asignacion
  rol: varchar("rol", { length: 20 }).notNull().default("asistente"), // "principal" | "asistente"
  razonAsignacion: varchar("razon_asignacion", { length: 500 }), // Razón de la asignación
  fechaAsignacion: timestamp("fecha_asignacion").notNull().default(new Date()),
  fechaFin: timestamp("fecha_fin"), // Fecha fin de la asignación (nullable)
  asignadoPor: varchar("asignado_por", { length: 36 }), // FK to users - who assigned this lawyer to the proceso
  status: varchar("status", { length: 20 }).notNull().default("activo"), // "activo" | "inactivo"
});

export const procesoLawyersRelations = relations(procesoLawyers, ({ one }) => ({
  proceso: one(procesos, {
    fields: [procesoLawyers.procesoId],
    references: [procesos.id],
  }),
  lawyer: one(lawyerProfiles, {
    fields: [procesoLawyers.lawyerId],
    references: [lawyerProfiles.id],
  }),
  asignadoPorUser: one(users, {
    fields: [procesoLawyers.asignadoPor],
    references: [users.id],
  }),
  tipoAsignacion: one(tipoAsignacion, {
    fields: [procesoLawyers.tipoAsignacionId],
    references: [tipoAsignacion.id],
  }),
}));

// ============================================
// Interfaces
// ============================================

/** ProcesoLawyer table row type */
export interface ProcesoLawyer {
  id: string;
  procesoId: string;
  lawyerId: string;
  tipoAsignacionId: number | null; // FK to tipo_asignacion
  rol: string;
  razonAsignacion: string | null; // Razón de la asignación
  fechaAsignacion: Date;
  fechaFin: Date | null; // Fecha fin de la asignación
  asignadoPor: string | null; // User ID who assigned this lawyer to the proceso
  status: string; // "activo" | "inactivo"
}

/** ProcesoLawyer insert type */
export interface InsertProcesoLawyer {
  id: string;
  procesoId: string;
  lawyerId: string;
  tipoAsignacionId?: number | null; // FK to tipo_asignacion
  rol?: string;
  razonAsignacion?: string | null; // Razón de la asignación
  fechaAsignacion?: Date;
  fechaFin?: Date | null; // Fecha fin de la asignación
  asignadoPor?: string | null; // User ID who assigned this lawyer to the proceso
  status?: string; // "activo" | "inactivo"
}

/** ProcesoLawyer with lawyer details */
export interface ProcesoLawyerWithLawyer extends ProcesoLawyer {
  lawyer: import("./lawyer-profile.schema").LawyerProfile;
  tipoAsignacion?: import("./tipo-asignacion.schema").TipoAsignacion | null;
  asignadoPorUser?: {
    id: string;
    email: string;
    name: string | null;
  } | null; // User who assigned this lawyer
}
