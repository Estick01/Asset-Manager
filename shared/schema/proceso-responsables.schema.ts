import { boolean, datetime, mysqlTable, varchar } from 'drizzle-orm/mysql-core';
import { relations } from 'drizzle-orm';
import { procesos } from './proceso.schema';
import { LawyerProfile, lawyerProfiles } from './lawyer-profile.schema';

/**
 * Proceso Responsables table
 * Tracks the responsible attorney for each process
 */
export const procesoResponsables = mysqlTable('proceso_responsables', {
  id: varchar('id', { length: 36 }).primaryKey(),
  procesoId: varchar('proceso_id', { length: 36 }).notNull(),
  lawyerId: varchar('lawyer_id', { length: 36 }).notNull(),
  asignadoPor: varchar('asignado_por', { length: 36 }),
  asignadoPorNombre: varchar('asignado_por_nombre', { length: 255 }),
  fechaInicio: datetime('fecha_inicio', { mode: 'date', fsp: 3 }).notNull(),
  fechaFin: datetime('fecha_fin', { mode: 'date', fsp: 3 }),
  razon: varchar('razon', { length: 255 }),
  activo: boolean('activo').default(true).notNull(),
});

export const procesoResponsablesRelations = relations(procesoResponsables, ({ one }) => ({
  proceso: one(procesos, {
    fields: [procesoResponsables.procesoId],
    references: [procesos.id],
  }),
  lawyer: one(lawyerProfiles, {
    fields: [procesoResponsables.lawyerId],
    references: [lawyerProfiles.id],
  }),
  asignadoPor: one(lawyerProfiles, {
    fields: [procesoResponsables.asignadoPor],
    references: [lawyerProfiles.id],
  }),
}));

export type ProcesoResponsable = typeof procesoResponsables.$inferSelect;
export type InsertProcesoResponsable = typeof procesoResponsables.$inferInsert;

/** Shape returned by getActiveResponsable — lawyer + persona anidada */
export interface ProcesoResponsableDTO {
  id: string | null;
  fechaAsignacion: Date | null;
  razon: string | null;
  asignadoPorNombre: string | null;
  lawyer:LawyerProfile | null;
}


