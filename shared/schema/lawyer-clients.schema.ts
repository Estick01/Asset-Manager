/**
 * Lawyer-Clients Relationship Schema
 * Intermediate table for managing lawyer-client relationships
 */

import { relations } from "drizzle-orm";
import { mysqlTable, varchar, text, timestamp, mysqlEnum } from "drizzle-orm/mysql-core";
import { lawyerProfiles } from "./lawyer-profile.schema";
import { clientes } from "./cliente.schema";

export const lawyerClients = mysqlTable("lawyer_clients", {
  id: varchar("id", { length: 36 }).primaryKey(),
  lawyerId: varchar("lawyer_id", { length: 36 }).notNull(),
  clientId: varchar("client_id", { length: 36 }).notNull(),
  status: mysqlEnum("status", [
    "active",
    "inactive",
    "terminated"
  ]).notNull().default("active"),
  relationshipStartedAt: timestamp("relationship_started_at")
    .defaultNow()
    .notNull(),
  relationshipEndedAt: timestamp("relationship_ended_at"),
  createdBy: varchar("created_by", { length: 36 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export type LawyerClientStatus = "active" | "inactive" | "terminated";

export interface LawyerClient {
  id: string;
  lawyerId: string;
  clientId: string;
  status: LawyerClientStatus;
  relationshipStartedAt: Date;
  relationshipEndedAt: Date | null;
  createdBy: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date | null;
}

export interface InsertLawyerClient {
  id: string;
  lawyerId: string;
  clientId: string;
  status?: LawyerClientStatus;
  relationshipStartedAt?: Date;
  relationshipEndedAt?: Date | null;
  createdBy?: string | null;
  notes?: string | null;
}

// ============================================
// Relations
// ============================================

export const lawyerClientsRelations = relations(lawyerClients, ({ one }) => ({
  lawyer: one(lawyerProfiles, {
    fields: [lawyerClients.lawyerId],
    references: [lawyerProfiles.id],
  }),
  client: one(clientes, {
    fields: [lawyerClients.clientId],
    references: [clientes.id],
  }),
}));
