
/**
 * Proceso Schema
 * Database table definition for procesos (processes)
 */

import { relations } from "drizzle-orm";
import { mysqlTable, text, varchar, boolean, timestamp, int, datetime } from "drizzle-orm/mysql-core";
import type { LegalStageCode } from "./legal-stage.schema";
import { Cliente, clientes } from "./cliente.schema";

import { TiposProceso, tiposProceso } from "./tipo-proceso.schema";
import { EstadoProceso, estadosProceso } from "./estado-proceso.schema";
import { procesoLawyers, ProcesoLawyerWithLawyer } from "./proceso-lawyer.schema";
import { ProcesoResponsableDTO } from "./proceso-responsables.schema";

export const procesos = mysqlTable("procesos", {
  id: varchar("id", { length: 36 }).primaryKey(),
  clienteId: varchar("cliente_id", { length: 36 }).notNull(),
  tipoProcesoId: int("tipo_proceso_id"), // FK to tiposProceso
  radicado: text("radicado").notNull(),
  juzgado: text("juzgado").notNull(),
  estadoId: int("estado_id").notNull(),
  descripcionEstado: text("descripcion_estado").notNull(),
  legalStage: varchar("legal_stage", { length: 50 }),             // etapa jurídica actual
  fechaVencimientoEtapa: datetime("fecha_vencimiento_etapa"),     // deadline de la etapa
  etapaActualizadaEn: timestamp("etapa_actualizada_en"),          // cuándo cambió de etapa
  fechaCreacion: timestamp("fecha_creacion").notNull().default(new Date()),
  state: boolean("state").notNull().default(true),
  communityPostId: varchar("community_post_id", { length: 36 }), // FK to posts (origen comunidad)
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
  legalStage: LegalStageCode | string | null;
  fechaVencimientoEtapa: Date | null;
  etapaActualizadaEn: Date | null;
  fechaCreacion: Date;
  state: boolean;
  communityPostId: string | null;
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
  legalStage?: LegalStageCode | string | null;
  fechaVencimientoEtapa?: Date | null;
  etapaActualizadaEn?: Date | null;
  fechaCreacion?: Date;
  state?: boolean;
  communityPostId?: string | null;
}

/** ProcesoDTO - Proceso with relations */
export interface ProcesoDTO extends Proceso {
  cliente?: Cliente;
  tipoProceso?: TiposProceso | null;
  estado?: EstadoProceso | null;
  lawyers?: ProcesoLawyerWithLawyer[];
  clienteNombre?: string;
  clienteUserId?: string;
  /** 'natural' | 'empresa' */
  tipoCliente?: string | null;
  /** Documento de identidad del cliente natural */
  clienteDocumento?: string | null;
  clienteTelefono?: string | null;
  clienteDepartamento?: { id: string; nombre: string } | null;
  clienteMunicipio?: { id: string; nombre: string } | null;
  /** Solo presente cuando tipoCliente === 'empresa' */
  representanteLegal?: {
    id: string;
    cargo: string;
    email: string;
    nombre: string;
    apellido: string;
    documento: string | null;
    telefono: string | null;
  } | null;
  responsable?: ProcesoResponsableDTO | null;
  tareasConteo?: {
    total: number;
    pendientes: number;
    en_progreso: number;
    completadas: number;
  } | null;
}

export type InsertProcesoLegacy = typeof procesos.$inferInsert;
