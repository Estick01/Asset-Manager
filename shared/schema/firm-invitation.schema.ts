import { mysqlTable, varchar, timestamp, mysqlEnum, text } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";
import { firmProfiles } from "./firm-profile.schema";
import { lawyerProfiles } from "./lawyer-profile.schema";
import { users } from "./user.schema";

export const firmInvitations = mysqlTable("firm_invitations", {
  id: varchar("id", { length: 36 }).primaryKey(),
  firmId: varchar("firm_id", { length: 36 }).notNull(),
  lawyerId: varchar("lawyer_id", { length: 36 }).notNull(),
  invitadoPor: varchar("invitado_por", { length: 36 }).notNull(), // FK users
  status: mysqlEnum("status", [
    "pendiente",
    "aceptada",
    "rechazada",
    "cancelada",
  ]).notNull().default("pendiente"),
  mensaje: text("mensaje"),               // mensaje opcional de la firma
  motivoRechazo: text("motivo_rechazo"), // si el abogado rechaza
  expiresAt: timestamp("expires_at"),    // expiración de la invitación
  respondedAt: timestamp("responded_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export const firmInvitationsRelations = relations(firmInvitations, ({ one }) => ({
  firm: one(firmProfiles, {
    fields: [firmInvitations.firmId],
    references: [firmProfiles.id],
  }),
  lawyer: one(lawyerProfiles, {
    fields: [firmInvitations.lawyerId],
    references: [lawyerProfiles.id],
  }),
  invitadoPorUser: one(users, {
    fields: [firmInvitations.invitadoPor],
    references: [users.id],
  }),
}));

export interface FirmInvitation {
  id: string;
  firmId: string;
  lawyerId: string;
  invitadoPor: string;
  status: "pendiente" | "aceptada" | "rechazada" | "cancelada";
  mensaje: string | null;
  motivoRechazo: string | null;
  expiresAt: Date | null;
  respondedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InsertFirmInvitation {
  id: string;
  firmId: string;
  lawyerId: string;
  invitadoPor: string;
  status?: "pendiente" | "aceptada" | "rechazada" | "cancelada";
  mensaje?: string | null;
  expiresAt?: Date | null;
}

export interface FirmInvitationWithDetails extends FirmInvitation {
  firm?: import("./firm-profile.schema").FirmProfile;
  lawyer?: import("./lawyer-profile.schema").LawyerProfile;
  invitadoPorUser?: {
    id: string;
    email: string;
    name: string | null;
  };
}
