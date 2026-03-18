/**
 * Cliente Natural Schema
 * 1:1 with clientes — holds persona data for natural person clients
 */

import { relations } from "drizzle-orm";
import { mysqlTable, varchar } from "drizzle-orm/mysql-core";
import { clientes } from "./cliente.schema";
import { personas } from "./persona.schema";

export const clientesNatural = mysqlTable("clientes_natural", {
  clienteId: varchar("cliente_id", { length: 36 }).primaryKey(),
  personaId: varchar("persona_id", { length: 36 }).notNull().unique(),
});

export const clientesNaturalRelations = relations(clientesNatural, ({ one }) => ({
  cliente: one(clientes, {
    fields: [clientesNatural.clienteId],
    references: [clientes.id],
  }),
  persona: one(personas, {
    fields: [clientesNatural.personaId],
    references: [personas.id],
  }),
}));

// ============================================
// Interfaces
// ============================================

export interface ClienteNatural {
  clienteId: string;
  personaId: string;
  persona?: import("./persona.schema").Persona | null;
}

export interface InsertClienteNatural {
  clienteId: string;
  personaId: string;
}
