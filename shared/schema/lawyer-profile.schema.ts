import { users } from './user.schema';
/**
 * Lawyer Profile Schema
 * Database table definition for lawyer_profiles
 */

import { relations } from "drizzle-orm";
import { mysqlTable, varchar, boolean, timestamp } from "drizzle-orm/mysql-core";

import { firmProfiles } from "./firm-profile.schema";
import { lawyerClients } from "./lawyer-clients.schema";
import { personas } from "./persona.schema";


export const lawyerProfiles = mysqlTable("lawyer_profiles", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull().unique(),
  firmId: varchar("firm_id", { length: 36 }).references(() => firmProfiles.id),
  personaId: varchar("persona_id", { length: 36 }).notNull().unique(),
  specialization: varchar("specialization", { length: 255 }),
  licenseNumber: varchar("license_number", { length: 50 }),
  isIndependent: boolean("is_independent").notNull().default(false),
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
  persona: one(personas, {
    fields: [lawyerProfiles.personaId],
    references: [personas.id],
  }),
  lawyerClients: many(lawyerClients),
}));

// ============================================
// Interfaces
// ============================================

/** LawyerProfile table row type */
export interface LawyerProfile {
  id: string;
  userId: string;
  firmId: string | null;
  firm:{
    id:string,
    name:string,
  }
  personaId: string;
  specialization: string | null;
  licenseNumber: string | null;
  isIndependent: boolean;
  createdAt: Date;
  updatedAt: Date;
  persona?: import("./persona.schema").Persona | null;
}

export interface UpdateLawyerProfileDTO {
  specialization?: string;
  licenseNumber?: string;
  persona?: {
    nombre?: string;
    apellido?: string;
    telefono?: string;
    documento?: string;
    tipoDocumentoId?: number;
    direccion?: string;
    departamentoId?: string;
    municipioId?: string;
  };
}

/** LawyerProfile insert type */
export interface InsertLawyerProfile {
  id: string;
  userId: string;
  firmId?: string | null;
  personaId: string;
  specialization?: string | null;
  licenseNumber?: string | null;
  isIndependent?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/** LawyerProfile relation types */
export interface LawyerProfileRelations extends LawyerProfile {
  user: import("./user.schema").User | null;
}

// Alias for backward compatibility
export type Abogado = LawyerProfile;
