/**
 * Representante Legal Schema
 * A person can represent multiple empresas or firms — personaId is NOT unique
 */

import { relations } from "drizzle-orm";
import { mysqlTable, varchar } from "drizzle-orm/mysql-core";
import { personas } from "./persona.schema";

export const representantesLegales = mysqlTable("representantes_legales", {
  id: varchar("id", { length: 36 }).primaryKey(),
  personaId: varchar("persona_id", { length: 36 }).notNull(),
  cargo: varchar("cargo", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
});

export const representantesLegalesRelations = relations(representantesLegales, ({ one }) => ({
  persona: one(personas, {
    fields: [representantesLegales.personaId],
    references: [personas.id],
  }),
}));

// ============================================
// Interfaces
// ============================================

export interface RepresentanteLegal {
  id: string;
  personaId: string;
  cargo: string;
  email: string;
  persona?: import("./persona.schema").Persona | null;
}

export interface InsertRepresentanteLegal {
  id: string;
  personaId: string;
  cargo: string;
  email: string;
}
