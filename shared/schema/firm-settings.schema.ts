// shared/schema/firm-settings.schema.ts
import { mysqlTable, varchar, boolean, timestamp } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";
import { firmProfiles } from "./firm-profile.schema";

export const firmSettings = mysqlTable("firm_settings", {
  id:                          varchar("id",                           { length: 36 }).primaryKey(),
  firmId:                      varchar("firm_id",                      { length: 36 }).notNull().unique(),
  allowPrivateClientes:        boolean("allow_private_clientes").notNull().default(false),
  allowPrivateProcesos:        boolean("allow_private_procesos").notNull().default(false),
  defaultClienteEsCompartido:  boolean("default_cliente_es_compartido").notNull().default(true),
  defaultProcesoEsCompartido:  boolean("default_proceso_es_compartido").notNull().default(true),
  notifMensajes:               boolean("notif_mensajes").notNull().default(true),
  notifVencimientos:           boolean("notif_vencimientos").notNull().default(true),
  notifCambiosProcesos:        boolean("notif_cambios_procesos").notNull().default(true),
  notifEquipoInvitaciones:     boolean("notif_equipo_invitaciones").notNull().default(true),
  notifAlertasPlan:            boolean("notif_alertas_plan").notNull().default(true),
  notifResumenSemanal:         boolean("notif_resumen_semanal").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export const firmSettingsRelations = relations(firmSettings, ({ one }) => ({
  firm: one(firmProfiles, {
    fields: [firmSettings.firmId],
    references: [firmProfiles.id],
  }),
}));

export type FirmSettings        = typeof firmSettings.$inferSelect;
export type InsertFirmSettings  = typeof firmSettings.$inferInsert;

export interface FirmSettingsDTO {
  firmId:                     string;
  allowPrivateClientes:       boolean;
  allowPrivateProcesos:       boolean;
  defaultClienteEsCompartido: boolean;
  defaultProcesoEsCompartido: boolean;
  notifMensajes:              boolean;
  notifVencimientos:          boolean;
  notifCambiosProcesos:       boolean;
  notifEquipoInvitaciones:    boolean;
  notifAlertasPlan:           boolean;
  notifResumenSemanal:        boolean;
}
