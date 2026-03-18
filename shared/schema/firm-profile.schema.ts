/**
 * Firm Profile Schema
 * Database table definition for firm_profiles
 */

import { relations } from "drizzle-orm";
import { mysqlTable, text, varchar, timestamp } from "drizzle-orm/mysql-core";
import { users } from "./user.schema";
import { planes } from "./plane.schema";
import { representantesLegales } from "./representante-legal.schema";


export const firmProfiles = mysqlTable("firm_profiles", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  nit: varchar("nit", { length: 50 }).notNull(),
  address: text("address"),
  phone: varchar("phone", { length: 50 }),
  planId: varchar("plan_id", { length: 36 }).notNull(),
  representanteLegalId: varchar("representante_legal_id", { length: 36 }),
  createdAt: timestamp("created_at").notNull().default(new Date()),
  updatedAt: timestamp("updated_at").notNull().default(new Date()).onUpdateNow(),
});

export const firmProfilesRelations = relations(firmProfiles, ({ one }) => ({
  user: one(users, {
    fields: [firmProfiles.userId],
    references: [users.id],
  }),
  plan: one(planes, {
    fields: [firmProfiles.planId],
    references: [planes.id],
  }),
  representanteLegal: one(representantesLegales, {
    fields: [firmProfiles.representanteLegalId],
    references: [representantesLegales.id],
  }),
}));

// ============================================
// Interfaces
// ============================================

/** FirmProfile table row type */
export interface FirmProfile {
  id: string;
  userId?: string;
  name: string;
  nit?: string;
  address?: string | null;
  phone?: string | null;
  planId?: string;
  representanteLegalId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  representanteLegal?: import("./representante-legal.schema").RepresentanteLegal | null;
}

/** FirmProfile insert type */
export interface InsertFirmProfile {
  id: string;
  userId: string;
  name: string;
  nit: string;
  address?: string | null;
  phone?: string | null;
  planId: string;
  representanteLegalId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/** FirmProfile relation types */
export interface FirmProfileRelations {
  user: import("./user.schema").User;
  plan: import("./plane.schema").Plan;
  representanteLegal: import("./representante-legal.schema").RepresentanteLegal | null;
}
