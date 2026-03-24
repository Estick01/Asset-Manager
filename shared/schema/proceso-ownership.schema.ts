// shared/schema/proceso-ownership.schema.ts
import {
  mysqlTable, varchar, timestamp, tinyint,
} from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";
import { procesos } from "./proceso.schema";

export type OwnerType = "abogado" | "bufete" | "sin_owner";

export const procesoOwnership = mysqlTable("proceso_ownership", {
  id:           varchar("id",         { length: 36 }).primaryKey(),
  procesoId:    varchar("proceso_id", { length: 36 }).notNull(),
  ownerType:    varchar("owner_type", { length: 20 }).notNull().$type<OwnerType>(),
  ownerId:      varchar("owner_id",   { length: 36 }),   // NULL when sin_owner
  fechaInicio:  timestamp("fecha_inicio").notNull().defaultNow(),
  fechaFin:     timestamp("fecha_fin"),
  activoUnique: tinyint("activo_unique"),   // 1 = activo, NULL = histórico
  creadoPor:    varchar("creado_por",  { length: 36 }).notNull(),
  razon:        varchar("razon",       { length: 500 }),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
  updatedAt:    timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export const procesoOwnershipRelations = relations(procesoOwnership, ({ one }) => ({
  proceso: one(procesos, {
    fields: [procesoOwnership.procesoId],
    references: [procesos.id],
  }),
}));

export type ProcesoOwnership       = typeof procesoOwnership.$inferSelect;
export type InsertProcesoOwnership = typeof procesoOwnership.$inferInsert;

// DTO returned to API consumers
export interface ProcesoOwnershipDTO {
  id:          string;
  procesoId:   string;
  ownerType:   OwnerType;
  ownerId:     string | null;
  fechaInicio: Date;
  fechaFin:    Date | null;
  activo:      boolean;
  creadoPor:   string;
  razon:       string | null;
}

// Input to create/transfer ownership
export interface TransferOwnershipDTO {
  ownerType: OwnerType;
  ownerId:   string | null;
  razon?:    string;
}
