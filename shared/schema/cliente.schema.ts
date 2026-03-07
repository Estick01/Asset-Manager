/**
 * Cliente Schema
 * Database table definition for clientes (clients)
 */

import { relations } from "drizzle-orm";
import { mysqlTable, text, varchar, boolean, timestamp, int } from "drizzle-orm/mysql-core";
import { users } from "./user.schema";
import { tiposDocumento } from "./tipos-documento.schema";
import { procesos } from "./proceso.schema";
import { departamentos, municipios } from "./ubicacion.schema";

export const clientes = mysqlTable("clientes", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull().unique(),
  nombre: varchar("nombre", { length: 100 }).notNull(),
  apellido: varchar("apellido", { length: 100 }).notNull(),
  telefono: varchar("telefono", { length: 50 }).notNull(),
  documento: varchar("documento", { length: 50 }).notNull(),
  tipoDocumentoId: int("tipo_documento_id").notNull(),
  direccion: text("direccion"),
  departamentoId: varchar("departamento_id", { length: 36 }),
  municipioId: varchar("municipio_id", { length: 36 }),
  fechaCreacion: timestamp("fecha_creacion").notNull().default(new Date()),
  activo: boolean("activo").notNull().default(true),
});

export const clientesRelations = relations(clientes, ({ one, many }) => ({
  user: one(users, {
    fields: [clientes.userId],
    references: [users.id],
  }),
  tipoDocumento: one(tiposDocumento, {
    fields: [clientes.tipoDocumentoId],
    references: [tiposDocumento.id],
  }),
  departamento: one(departamentos, {
    fields: [clientes.departamentoId],
    references: [departamentos.id],
  }),
  municipio: one(municipios, {
    fields: [clientes.municipioId],
    references: [municipios.id],
  }),
  procesos: many(procesos),
}));

// ============================================
// Interfaces
// ============================================

/** Cliente table row type */
export interface Cliente {
  id: string;
  userId ?: string;
  nombre: string;
  apellido: string;
  telefono: string;
  documento: string;
  tipoDocumentoId: number;
  direccion: string | null;
  departamentoId: string | null;
  municipioId: string | null;
  activo: boolean;
  fechaCreacion: Date;
  departamento?: { id: string; codigo: string; nombre: string } | null;
  municipio?: { id: string; codigo: string; nombre: string } | null;
  user?:{
    id: string;
    email: string;
    isActive: boolean;
    createdAt: Date;
  }| null;
  tipoDocumento?: {
    id: number;
    codigo: string;
    nombre: string;
  }| null;
}

/** Cliente insert type */
export interface InsertCliente {
  id: string;
  userId: string;
  nombre: string;
  apellido: string;
  telefono: string;
  documento: string;
  tipoDocumentoId: number;
  direccion?: string | null;
  departamentoId?: string | null;
  municipioId?: string | null;
  activo?: boolean;
  fechaCreacion?: Date;
  correo?: string;
  password?: string;
  lawyerId?: string | null;
}

/** Cliente relation types */
export interface ClienteRelations  {
  user: import("./user.schema").User | null;
  tipoDocumento: import("./tipos-documento.schema").TiposDocumento | null;
  departamento: import("./ubicacion.schema").Departamento | null;
  municipio: import("./ubicacion.schema").Municipio | null;
  procesos: import("./proceso.schema").ProcesoDTO[];
}

export interface ClienteDTO extends Cliente {
  user?: import("./user.schema").User;
  tipoDocumento?: import("./tipos-documento.schema").TiposDocumento;
  departamento?: import("./ubicacion.schema").Departamento;
  municipio?: import("./ubicacion.schema").Municipio;
  procesos?: import("./proceso.schema").ProcesoDTO[];
}


