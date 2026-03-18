/**
 * Auth-related relations (roles, permisos, modulos).
 * Kept in a separate file to avoid circular imports between schema files.
 */
import { relations } from "drizzle-orm";
import { permisos } from "./permiso.schema";
import { modulos } from "./modulo.schema";
import { rolesPermisos } from "./rolesPermisos.schema";
import { roles } from "./rol.schema";

export const permisosRelations = relations(permisos, ({ one, many }) => ({
  modulo: one(modulos, { fields: [permisos.moduloId], references: [modulos.id] }),
  rolesPermisos: many(rolesPermisos),
}));

export const modulosRelations = relations(modulos, ({ many }) => ({
  permisos: many(permisos),
}));

export const rolesPermisosRelations = relations(rolesPermisos, ({ one }) => ({
  rol: one(roles, { fields: [rolesPermisos.rolId], references: [roles.id] }),
  permiso: one(permisos, { fields: [rolesPermisos.permisoId], references: [permisos.id] }),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  rolesPermisos: many(rolesPermisos),
}));
