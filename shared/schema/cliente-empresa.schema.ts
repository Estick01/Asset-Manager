/**
 * Cliente Empresa Schema
 * 1:1 with clientes — holds company-specific data
 */

import { relations } from "drizzle-orm";
import { mysqlTable, varchar } from "drizzle-orm/mysql-core";
import { clientes } from "./cliente.schema";
import { representantesLegales } from "./representante-legal.schema";

export const clientesEmpresa = mysqlTable("clientes_empresa", {
  clienteId: varchar("cliente_id", { length: 36 }).primaryKey(),
  razonSocial: varchar("razon_social", { length: 255 }).notNull(),
  nit: varchar("nit", { length: 50 }).notNull(),
  sector: varchar("sector", { length: 100 }),
  representanteLegalId: varchar("representante_legal_id", { length: 36 }),
});

export const clientesEmpresaRelations = relations(clientesEmpresa, ({ one }) => ({
  cliente: one(clientes, {
    fields: [clientesEmpresa.clienteId],
    references: [clientes.id],
  }),
  representanteLegal: one(representantesLegales, {
    fields: [clientesEmpresa.representanteLegalId],
    references: [representantesLegales.id],
  }),
}));

// ============================================
// Interfaces
// ============================================

export interface ClienteEmpresa {
  clienteId: string;
  razonSocial: string;
  nit: string;
  sector: string | null;
  representanteLegalId: string | null;
  representanteLegal?: import("./representante-legal.schema").RepresentanteLegal | null;
}

export interface InsertClienteEmpresa {
  clienteId: string;
  razonSocial: string;
  nit: string;
  sector?: string | null;
  representanteLegalId?: string | null;
}
