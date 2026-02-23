import { relations, sql } from "drizzle-orm";
import { mysqlTable, text, varchar, boolean, timestamp, int, decimal } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { stat } from "node:fs";
import { State } from "react-native-gesture-handler";
import { z } from "zod";

// Tabla de Planes
export const planes = mysqlTable("planes", {
  id: varchar("id", { length: 36 }).primaryKey(),
  nombre: varchar("nombre", { length: 50 }).notNull(),
  precio: decimal("precio", { precision: 10, scale: 2 }).notNull(),
  caracteristicas: text("caracteristicas").notNull(),
  state: boolean("state").notNull().default(true),
});

// Tabla de Abogados (reemplaza a users)
export const abogados = mysqlTable("abogados", {
  id: varchar("id", { length: 36 }).primaryKey(),
  nombre: text("nombre").notNull(),
  correo: text("correo").notNull(),
  password: text("password").notNull(),
  despacho: text("despacho").notNull(),
  telefono: text("telefono").notNull(),
  planId: varchar("plan_id", { length: 36 }).notNull(),
  rolId: int("rol_id"), // Nullable para compatibilidad con registros existentes
  activo: boolean("activo").notNull().default(true),
  fechaRegistro: timestamp("fecha_registro").notNull().default(sql`now()`),
  state: boolean("state").notNull().default(true),
});

export const abogadosRelations = relations(abogados, ({ one, many }) => ({
  plan: one(planes, {
    fields: [abogados.planId],
    references: [planes.id],
  }),
  rol: one(roles, {
    fields: [abogados.rolId],
    references: [roles.id],
  }),
  clientes: many(clientes),
  procesos: many(procesos),
}));

// Tabla de Clientes
export const clientes = mysqlTable("clientes", {
  id: varchar("id", { length: 36 }).primaryKey(),
  abogadoId: varchar("abogado_id", { length: 36 }).notNull(),
  nombre: text("nombre").notNull(),
  correo: text("correo").notNull(),
  telefono: text("telefono").notNull(),
  documento: text("documento").notNull(),
  password: text("password").notNull(),
  rolId: int("rol_id").notNull().default(1), // Relación con roles, por defecto rol de cliente
  activo: boolean("activo").notNull().default(true),
  fechaCreacion: timestamp("fecha_creacion").notNull().default(sql`now()`),
  state: boolean("state").notNull().default(true),
});

export const clientesRelations = relations(clientes, ({ one, many }) => ({
  abogado: one(abogados, {
    fields: [clientes.abogadoId],
    references: [abogados.id],
  }),
  rol: one(roles, {
    fields: [clientes.rolId],
    references: [roles.id],
  }),
  procesos: many(procesos),
}));

// Tabla de Estados de Proceso
export const estadosProceso = mysqlTable("estados_proceso", {
  id: int("id").autoincrement().primaryKey(),
  nombre: varchar("nombre", { length: 50 }).notNull(),
  codigo: varchar("codigo", { length: 50 }).notNull().unique(),
  color: varchar("color", { length: 20 }).notNull(), // ejemplo: #FF0000
  state: boolean("state").notNull().default(true), // activo / inactivo
  createdAt: timestamp("created_at")
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .onUpdateNow(),
});

// Tabla de Tipos de Proceso
export const tiposProceso = mysqlTable("tipos_proceso", {
  id: int("id").autoincrement().primaryKey(),
  nombre: varchar("nombre", { length: 100 }).notNull(),
  descripcion: text("descripcion"),
  activo: boolean("activo").notNull().default(true),
  createdAt: timestamp("created_at")
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .onUpdateNow(),
});

// Relaciones de Tipos de Proceso
export const tiposProcesoRelations = relations(tiposProceso, ({ many }) => ({
  procesos: many(procesos),
}));

// Tabla de Procesos
export const procesos = mysqlTable("procesos", {
  id: varchar("id", { length: 36 }).primaryKey(),
  abogadoId: varchar("abogado_id", { length: 36 }).notNull(),
  clienteId: varchar("cliente_id", { length: 36 }).notNull(),
  tipoProcesoId: int("tipo_proceso_id"), // FK to tiposProceso (optional for backwards compatibility)
  tipoProceso: text("tipo_proceso"), // Keep for backwards compatibility
  radicado: text("radicado").notNull(),
  juzgado: text("juzgado").notNull(),
  estadoId: int("estado_id").notNull(),
  descripcionEstado: text("descripcion_estado").notNull(),
  fechaCreacion: timestamp("fecha_creacion").notNull().default(sql`now()`),
  state: boolean("state").notNull().default(true),
});

export const procesosRelations = relations(procesos, ({ one, many }) => ({
  abogado: one(abogados, {
    fields: [procesos.abogadoId],
    references: [abogados.id],
  }),
  cliente: one(clientes, {
    fields: [procesos.clienteId],
    references: [clientes.id],
  }),
  tipoProceso: one(tiposProceso, {
    fields: [procesos.tipoProcesoId],
    references: [tiposProceso.id],
  }),
  estado: one(estadosProceso, {
    fields: [procesos.estadoId],
    references: [estadosProceso.id],
  }),
  actualizaciones: many(actualizaciones),
  documentos: many(documentos),
}));

// Tabla de Tipos de Actualización
export const tiposActualizacion = mysqlTable("tipos_actualizacion", {
  id: int("id").autoincrement().primaryKey(),
  nombre: varchar("nombre", { length: 50 }).notNull(), // "manual", "documento"
});

// Tabla de Actualizaciones
export const actualizaciones = mysqlTable("actualizaciones", {
  id: varchar("id", { length: 36 }).primaryKey(),
  procesoId: varchar("proceso_id", { length: 36 }).notNull(),
  fecha: timestamp("fecha").notNull().default(sql`now()`),
  titulo: text("titulo").notNull(),
  descripcion: text("descripcion").notNull(),
  tipoId: int("tipo_id").notNull(), // FK to tipos_actualizacion
  documentoId: varchar("documento_id", { length: 36 }), // Nullable
  state: boolean("state").notNull().default(true),
});

export const actualizacionesRelations = relations(actualizaciones, ({ one }) => ({
  proceso: one(procesos, {
    fields: [actualizaciones.procesoId],
    references: [procesos.id],
  }),
  tipo: one(tiposActualizacion, {
    fields: [actualizaciones.tipoId],
    references: [tiposActualizacion.id],
  }),
  documento: one(documentos, {
    fields: [actualizaciones.documentoId],
    references: [documentos.id],
  }),
}));

// Tabla de Documentos
export const documentos = mysqlTable("documentos", {
  id: varchar("id", { length: 36 }).primaryKey(),
  procesoId: varchar("proceso_id", { length: 36 }).notNull(),
  nombre: text("nombre").notNull(),
  descripcion: text("descripcion"), // Descripción opcional del documento
  uri: text("uri").notNull(),
  tipo: text("tipo").notNull(),
  tamano: int("tamano").notNull(),
  fechaSubida: timestamp("fecha_subida").notNull().default(sql`now()`),
  state: boolean("state").notNull().default(true),
});

export const documentosRelations = relations(documentos, ({ one }) => ({
  proceso: one(procesos, {
    fields: [documentos.procesoId],
    references: [procesos.id],
  }),
}));

// Tabla de Roles
export const roles = mysqlTable("roles", {
  id: int("id").autoincrement().primaryKey(),
  nombre: varchar("nombre", { length: 50 }).notNull().unique(), // "admin", "abogado", "cliente"
  descripcion: text("descripcion"),
  activo: boolean("activo").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  state: boolean("state").notNull().default(true),
});

// Tabla de Módulos (para organizar permisos)
export const modulos = mysqlTable("modulos", {
  id: int("id").autoincrement().primaryKey(),
  nombre: varchar("nombre", { length: 50 }).notNull().unique(), // "clientes", "procesos", "configuracion", etc.
  descripcion: text("descripcion"),
  icono: varchar("icono", { length: 50 }), // Icono para mostrar en la UI
  orden: int("orden").default(0), // Para ordenar los módulos
  activo: boolean("activo").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  state: boolean("state").notNull().default(true),
});

// Tabla de Permisos
export const permisos = mysqlTable("permisos", {
  id: int("id").autoincrement().primaryKey(),
  codigo: varchar("codigo", { length: 100 }).notNull().unique(), // "clientes.ver", "clientes.crear", "procesos.editar", etc.
  nombre: varchar("nombre", { length: 100 }).notNull(),
  descripcion: text("descripcion"),
  moduloId: int("modulo_id"), // FK to modulos table
  activo: boolean("activo").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  state: boolean("state").notNull().default(true),
});

// Tabla de Roles-Permisos (junction table)
export const rolesPermisos = mysqlTable("roles_permisos", {
  id: int("id").autoincrement().primaryKey(),
  rolId: int("rol_id").notNull(),
  permisoId: int("permiso_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Relaciones de Roles
export const rolesRelations = relations(roles, ({ many }) => ({
  rolesPermisos: many(rolesPermisos),
}));

// Relaciones de Módulos
export const modulosRelations = relations(modulos, ({ many }) => ({
  permisos: many(permisos),
}));

// Relaciones de Permisos
export const permisosRelations = relations(permisos, ({ one, many }) => ({
  modulo: one(modulos, {
    fields: [permisos.moduloId],
    references: [modulos.id],
  }),
  rolesPermisos: many(rolesPermisos),
}));

// Relaciones de RolesPermisos
export const rolesPermisosRelations = relations(rolesPermisos, ({ one }) => ({
  rol: one(roles, {
    fields: [rolesPermisos.rolId],
    references: [roles.id],
  }),
  permiso: one(permisos, {
    fields: [rolesPermisos.permisoId],
    references: [permisos.id],
  }),
}));

// Tabla de Notificaciones
export const notificaciones = mysqlTable("notificaciones", {
  id: int("id").autoincrement().primaryKey(),
  procesoId: varchar("proceso_id", { length: 255 }).notNull(),
  clienteId: varchar("cliente_id", { length: 255 }).notNull(),
  abogadoId: varchar("abogado_id", { length: 255 }).notNull(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  mensaje: text("mensaje").notNull(),
  tipo: varchar("tipo", { length: 50 }).notNull().default("estado_cambio"), // estado_cambio, actualizacion, recordatorio, general
  leidoCliente: boolean("leido_cliente").notNull().default(false),
  leidoAbogado: boolean("leido_abogado").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

// Zod schemas for insertion
export const insertAbogadoSchema = createInsertSchema(abogados);
export const insertClienteSchema = createInsertSchema(clientes);
export const insertProcesoSchema = createInsertSchema(procesos);
export const insertActualizacionSchema = createInsertSchema(actualizaciones).extend({
  // Optional: allow sending tipo as string (will be converted to tipoId)
  tipo: z.string().optional(),
});
export const insertDocumentoSchema = createInsertSchema(documentos);
export const insertPlanSchema = createInsertSchema(planes);
export const insertRolSchema = createInsertSchema(roles);
export const insertPermisoSchema = createInsertSchema(permisos);
export const insertRolPermisoSchema = createInsertSchema(rolesPermisos);
export const insertNotificacionSchema = createInsertSchema(notificaciones);

// Export types
export type Plan = typeof planes.$inferSelect;
export type InsertPlan = z.infer<typeof insertPlanSchema>;
export type Abogado = typeof abogados.$inferSelect;
export type InsertAbogado = z.infer<typeof insertAbogadoSchema>;
export type Cliente = typeof clientes.$inferSelect;
export type InsertCliente = z.infer<typeof insertClienteSchema>;
export type Proceso = typeof procesos.$inferSelect;
export type InsertProceso = z.infer<typeof insertProcesoSchema>;
export type EstadoProceso = typeof estadosProceso.$inferSelect;
export type TiposProceso = typeof tiposProceso.$inferSelect;
export type Actualizacion = typeof actualizaciones.$inferSelect;
export type InsertActualizacion = z.infer<typeof insertActualizacionSchema>;
export type TipoActualizacion = typeof tiposActualizacion.$inferSelect;
export type Notificacion = typeof notificaciones.$inferSelect;
export type InsertNotificacion = z.infer<typeof insertNotificacionSchema>;
export type Documento = typeof documentos.$inferSelect;
export type InsertDocumento = z.infer<typeof insertDocumentoSchema>;
export type Rol = typeof roles.$inferSelect;
export type InsertRol = z.infer<typeof insertRolSchema>;
export type Permiso = typeof permisos.$inferSelect;
export type InsertPermiso = z.infer<typeof insertPermisoSchema>;
export type Modulo = typeof modulos.$inferSelect;
export type InsertModulo = typeof modulos.$inferInsert;
export type RolPermiso = typeof rolesPermisos.$inferSelect;
export type InsertRolPermiso = z.infer<typeof insertRolPermisoSchema>;
