import { mysqlTable, varchar, tinyint, timestamp } from 'drizzle-orm/mysql-core';
import { relations } from 'drizzle-orm';

export const departamentos = mysqlTable('departamentos', {
  id: varchar('id', { length: 36 }).primaryKey(),
  codigo: varchar('codigo', { length: 10 }).notNull().unique(),
  nombre: varchar('nombre', { length: 100 }).notNull(),
  state: tinyint('state').notNull().default(1),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

export const departamentosRelations = relations(departamentos, ({ many }) => ({
  municipios: many(municipios),
}));

export const municipios = mysqlTable('municipios', {
  id: varchar('id', { length: 36 }).primaryKey(),
  departamentoId: varchar('departamento_id', { length: 36 }).notNull(),
  codigo: varchar('codigo', { length: 10 }).notNull(),
  nombre: varchar('nombre', { length: 100 }).notNull(),
  state: tinyint('state').notNull().default(1),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

export const municipiosRelations = relations(municipios, ({ one }) => ({
  departamento: one(departamentos, {
    fields: [municipios.departamentoId],
    references: [departamentos.id],
  }),
}));

export type Departamento = typeof departamentos.$inferSelect;
export type NewDepartamento = typeof departamentos.$inferInsert;
export type Municipio = typeof municipios.$inferSelect;
export type NewMunicipio = typeof municipios.$inferInsert;
