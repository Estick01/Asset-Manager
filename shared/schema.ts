import { relations, sql } from "drizzle-orm";
import { mysqlTable, text, varchar, boolean, timestamp } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = mysqlTable("users", {
  id: varchar("id", { length: 36 }).primaryKey(),
  username: text("username").notNull(),
  password: text("password").notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  clientes: many(clientes),
}));

export const clientes = mysqlTable("clientes", {
  id: varchar("id", { length: 36 }).primaryKey(),
  abogadoId: varchar("abogado_id", { length: 36 }).notNull(),
  nombre: text("nombre").notNull(),
  correo: text("correo").notNull(),
  telefono: text("telefono").notNull(),
  documento: text("documento").notNull(),
  password: text("password").notNull(),
  activo: boolean("activo").notNull().default(true),
  fechaCreacion: timestamp("fecha_creacion").notNull().default(sql`now()`),
});

export const clientesRelations = relations(clientes, ({ one }) => ({
  abogado: one(users, {
    fields: [clientes.abogadoId],
    references: [users.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertClienteSchema = createInsertSchema(clientes);

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertCliente = z.infer<typeof insertClienteSchema>;
export type Cliente = typeof clientes.$inferSelect;
