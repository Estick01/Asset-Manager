/**
 * Lawyer Profile Schema
 * Database table definition for lawyer_profiles
 */

import { relations } from "drizzle-orm";
import { mysqlTable, text, varchar, boolean, timestamp } from "drizzle-orm/mysql-core";
import { users } from "./user.schema";
import { firmProfiles } from "./firm-profile.schema";


export const lawyerProfiles = mysqlTable("lawyer_profiles", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull().unique(),
  firmId: varchar("firm_id", { length: 36 }).references(() => firmProfiles.id), // FK a firm_profiles (nullable para independientes)
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  specialization: varchar("specialization", { length: 255 }), // Especialización profesional
  licenseNumber: varchar("license_number", { length: 50 }), // Número de licencia profesional
  isIndependent: boolean("is_independent").notNull().default(false), // Si trabaja de forma independiente
  createdAt: timestamp("created_at").notNull().default(new Date()),
  updatedAt: timestamp("updated_at").notNull().default(new Date()).onUpdateNow(),
});

export const lawyerProfilesRelations = relations(lawyerProfiles, ({ one, many }) => ({
  user: one(users, {
    fields: [lawyerProfiles.userId],
    references: [users.id],
  }),
  firm: one(firmProfiles, {
    fields: [lawyerProfiles.firmId],
    references: [firmProfiles.id],
  }),
}));

// ============================================
// Interfaces
// ============================================

/** LawyerProfile table row type */
export interface LawyerProfile {
  id: string;
  userId: string;
  firmId: string | null;
  firstName: string;
  lastName: string;
  phone: string | null;
  address: string | null;
  specialization: string | null;
  licenseNumber: string | null;
  isIndependent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateLawyerProfileDTO {
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  specialization?: string;
  licenseNumber?: string;
}

/** LawyerProfile insert type */
export interface InsertLawyerProfile {
  id: string;
  userId: string;
  firmId?: string | null;
  firstName: string;
  lastName: string;
  phone?: string | null;
  address?: string | null;
  specialization?: string | null;
  licenseNumber?: string | null;
  isIndependent?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/** LawyerProfile relation types */
export interface LawyerProfileRelations {
  user: import("./user.schema").User | null;
  firm: import("./firm-profile.schema").FirmProfile | null;
}

// Alias for backward compatibility
export type Abogado = LawyerProfile;
