/**
 * User Schema
 * Database table definition for users
 */

import { mysqlTable, varchar, boolean, timestamp, text, int } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";
import { roles } from "./rol.schema";

export const users = mysqlTable("users", {
  id: varchar("id", { length: 36 }).primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  name: varchar("name", { length: 100 }),
  rolId: int("rol_id"),
  planId: varchar("plan_id", { length: 36 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(new Date()),
  updatedAt: timestamp("updated_at").notNull().default(new Date()).onUpdateNow(),
});


export const usersRelations = relations(users, ({ one }) => ({
  rol: one(roles, {
    fields: [users.rolId],
    references: [roles.id],
  }),
}));

// ===========================================
// Interfaces
// ============================================

/** User table row type */
export interface User {
  id: string;
  email: string;
  name: string | null;
  rolId?: number | null;
  planId?: string | null;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  passwordHash?: string;
}

/** User insert type */
export interface InsertUser {
  id: string;
  email: string;
  passwordHash: string;
  name?: string | null;
  rolId?: number | null;
  planId?: string | null;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/** User relation types */
export interface UserRelations {
  rol: import("./rol.schema").Rol | null;
}
export interface UserWithRol extends User {
  rol: UserRelations['rol']; // Rol | null
}

export const EnumRol = {
  ADMIN: { id: 1, nombre: "admin" },
  ABOGADO: { id: 2, nombre: "abogado" },
  NUEVO: { id: 3, nombre: "nuevo" },
  CLIENTE: { id: 4, nombre: "cliente" },
  BUFETE: { id: 5, nombre: "bufete" },
} as const;

export type EnumRolType = typeof EnumRol[keyof typeof EnumRol]["nombre"];

// Aliases for backward compatibility
export type UserDTO = User;

