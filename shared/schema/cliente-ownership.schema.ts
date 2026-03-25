// shared/schema/cliente-ownership.schema.ts
import {
  mysqlTable, varchar, timestamp, tinyint,
} from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";
import { clientes } from "./cliente.schema";

export type ClienteOwnerType = "abogado" | "bufete";

export const clienteOwnership = mysqlTable("cliente_ownership", {
  id:           varchar("id",          { length: 36 }).primaryKey(),
  clienteId:    varchar("cliente_id",  { length: 36 }).notNull(),
  ownerType:    varchar("owner_type",  { length: 20 }).notNull().$type<ClienteOwnerType>(),
  ownerId:      varchar("owner_id",    { length: 36 }).notNull(),
  fechaInicio:  timestamp("fecha_inicio").notNull().defaultNow(),
  fechaFin:     timestamp("fecha_fin"),
  activoUnique: tinyint("activo_unique"),   // 1 = activo, NULL = histórico
  creadoPor:    varchar("creado_por",  { length: 36 }).notNull(),
  razon:        varchar("razon",       { length: 500 }),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
  updatedAt:    timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export const clienteOwnershipRelations = relations(clienteOwnership, ({ one }) => ({
  cliente: one(clientes, {
    fields: [clienteOwnership.clienteId],
    references: [clientes.id],
  }),
}));

export type ClienteOwnership       = typeof clienteOwnership.$inferSelect;
export type InsertClienteOwnership = typeof clienteOwnership.$inferInsert;

// DTO returned to API consumers
export interface ClienteOwnershipDTO {
  id:          string;
  clienteId:   string;
  ownerType:   ClienteOwnerType;
  ownerId:     string;
  fechaInicio: Date;
  fechaFin:    Date | null;
  activo:      boolean;
  creadoPor:   string;
  razon:       string | null;
}

// Input to create/transfer ownership
export interface TransferClienteOwnershipDTO {
  ownerType: ClienteOwnerType;
  ownerId:   string;
  razon?:    string;
}
