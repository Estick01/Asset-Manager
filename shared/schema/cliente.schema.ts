/**
 * Cliente Schema
 * Base table for all clients — natural persons and companies
 */

import { relations } from "drizzle-orm";
import { mysqlTable, varchar, boolean, timestamp, mysqlEnum } from "drizzle-orm/mysql-core";
import { users } from "./user.schema";
import { procesos } from "./proceso.schema";
import { lawyerClients } from "./lawyer-clients.schema";
import { clientesNatural } from "./cliente-natural.schema";
import { clientesEmpresa } from "./cliente-empresa.schema";

export const clientes = mysqlTable("clientes", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull().unique(),
  tipo: mysqlEnum("tipo", ["natural", "empresa"]).notNull().default("natural"),
  fechaCreacion: timestamp("fecha_creacion").notNull().default(new Date()),
  activo: boolean("activo").notNull().default(true),
  esPrivado: boolean("es_privado").notNull().default(false),
  createdBy: varchar("created_by", { length: 36 }),
});

export const clientesRelations = relations(clientes, ({ one, many }) => ({
  user: one(users, {
    fields: [clientes.userId],
    references: [users.id],
  }),
  natural: one(clientesNatural, {
    fields: [clientes.id],
    references: [clientesNatural.clienteId],
  }),
  empresa: one(clientesEmpresa, {
    fields: [clientes.id],
    references: [clientesEmpresa.clienteId],
  }),
  procesos: many(procesos),
  lawyerClients: many(lawyerClients),
}));

// ============================================
// Interfaces
// ============================================

export type ClienteTipo = "natural" | "empresa";

export interface Cliente {
  id: string;
  userId?: string;
  tipo: ClienteTipo;
  activo: boolean;
  fechaCreacion: Date;
  procesosStats:any;
  esPrivado: boolean;
  createdBy: string | null;
  user?: {
    id: string;
    email: string;
    isActive: boolean;
    createdAt: Date;
  } | null;
  natural?: import("./cliente-natural.schema").ClienteNatural | null;
  empresa?: import("./cliente-empresa.schema").ClienteEmpresa | null;
}

export interface InsertCliente {
  id: string;
  userId: string;
  tipo: ClienteTipo;
  activo?: boolean;
  fechaCreacion?: Date;
  esPrivado?: boolean;
  createdBy?: string | null;
}

/** Legacy compat — used in some services */
export interface ClienteRelations extends Cliente {
  procesos: import("./proceso.schema").ProcesoDTO[];
}
