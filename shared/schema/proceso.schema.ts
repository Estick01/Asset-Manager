
/**
 * Proceso Schema
 * Database table definition for procesos (processes)
 */

import { relations } from "drizzle-orm";
import { mysqlTable, text, varchar, boolean, timestamp, int } from "drizzle-orm/mysql-core";
import { Cliente, clientes } from "./cliente.schema";

import { TiposProceso, tiposProceso } from "./tipo-proceso.schema";
import { EstadoProceso, estadosProceso } from "./estado-proceso.schema";
import { procesoLawyers, ProcesoLawyerWithLawyer } from "./proceso-lawyer.schema";
import { type LawyerProfile } from "./lawyer-profile.schema";

export const procesos = mysqlTable("procesos", {
  id: varchar("id", { length: 36 }).primaryKey(),
  clienteId: varchar("cliente_id", { length: 36 }).notNull(),
  tipoProcesoId: int("tipo_proceso_id"), // FK to tiposProceso
  radicado: text("radicado").notNull(),
  juzgado: text("juzgado").notNull(),
  estadoId: int("estado_id").notNull(),
  descripcionEstado: text("descripcion_estado").notNull(),
  fechaCreacion: timestamp("fecha_creacion").notNull().default(new Date()),
  state: boolean("state").notNull().default(true),
});

export const procesosRelations = relations(procesos, ({ one, many }) => ({
  cliente: one(clientes, {
    fields: [procesos.clienteId],
    references: [clientes.id],
  }),
  tipoProceso: one(tiposProceso, {
    fields: [procesos.tipoProcesoId],
    references: [tiposProceso.id],
  }),
  estado: one(estadosProceso, {
    fields: [procesos.estadoId],
    references: [estadosProceso.id],
  }),
  lawyers: many(procesoLawyers),
}));

// ============================================
// Interfaces
// ============================================

/** Proceso table row type */
export interface Proceso {
  id: string;
  clienteId: string;
  tipoProcesoId: number | null;
  radicado: string;
  juzgado: string;
  estadoId: number;
  descripcionEstado: string;
  fechaCreacion: Date;
  state: boolean;
}

/** Proceso insert type */
export interface InsertProceso {
  id: string;
  clienteId: string;
  tipoProcesoId?: number | null;
  radicado: string;
  juzgado: string;
  estadoId: number;
  descripcionEstado: string;
  fechaCreacion?: Date;
  state?: boolean;
}

/** ProcesoDTO - Proceso with relations */
export interface ProcesoDTO extends Proceso {
  cliente?: Cliente;
  tipoProceso?: TiposProceso | null;
  estado?: EstadoProceso | null;
  lawyers?: ProcesoLawyerWithLawyer[];
  clienteNombre?: string;
  clienteUserId?: string;
  responsable?: LawyerProfile | null;
  responsableFechaAsignacion?: Date | null;
  responsableRazon?: string | null;
  responsableAsignadoPorNombre?: string | null;
  tareasConteo?: {
    total: number;
    pendientes: number;
    en_progreso: number;
    completadas: number;
  } | null;
}

export type InsertProcesoLegacy = typeof procesos.$inferInsert;
