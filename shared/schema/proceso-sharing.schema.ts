// shared/schema/proceso-sharing.schema.ts
import {
  mysqlTable, varchar, timestamp, tinyint,
} from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";
import { procesos } from "./proceso.schema";

export type SharedWithType    = "bufete" | "corporacion" | "cliente";
export type SharingPermission = "ver" | "comentar" | "editar";

// Techo de permisos por tipo de entidad receptora
export const PERMISSION_CEILING: Record<SharedWithType, SharingPermission[]> = {
  bufete:      ["ver", "comentar", "editar"],
  corporacion: ["ver", "comentar", "editar"],
  cliente:     ["ver"],   // Clientes: máximo 'ver'
};

export const procesoSharing = mysqlTable("proceso_sharing", {
  id:             varchar("id",               { length: 36 }).primaryKey(),
  procesoId:      varchar("proceso_id",       { length: 36 }).notNull(),
  sharedWithType: varchar("shared_with_type", { length: 20 }).notNull().$type<SharedWithType>(),
  sharedWithId:   varchar("shared_with_id",   { length: 36 }).notNull(),
  permission:     varchar("permission",       { length: 20 }).notNull().$type<SharingPermission>(),
  fechaInicio:    timestamp("fecha_inicio").notNull().defaultNow(),
  fechaFin:       timestamp("fecha_fin"),
  activoUnique:   tinyint("activo_unique"),
  creadoPor:      varchar("creado_por",        { length: 36 }).notNull(),
  razon:          varchar("razon",             { length: 500 }),
  createdAt:      timestamp("created_at").notNull().defaultNow(),
  updatedAt:      timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export const procesoSharingRelations = relations(procesoSharing, ({ one }) => ({
  proceso: one(procesos, {
    fields: [procesoSharing.procesoId],
    references: [procesos.id],
  }),
}));

export type ProcesoSharing       = typeof procesoSharing.$inferSelect;
export type InsertProcesoSharing = typeof procesoSharing.$inferInsert;

export interface ProcesoSharingDTO {
  id:             string;
  procesoId:      string;
  sharedWithType: SharedWithType;
  sharedWithId:   string;
  permission:     SharingPermission;
  fechaInicio:    Date;
  fechaFin:       Date | null;
  activo:         boolean;
  creadoPor:      string;
  razon:          string | null;
}

export interface CreateSharingDTO {
  sharedWithType: SharedWithType;
  sharedWithId:   string;
  permission:     SharingPermission;
  razon?:         string;
}
