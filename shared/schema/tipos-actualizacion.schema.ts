import { mysqlTable, int, varchar, text } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";
import { actualizaciones } from "./actualizaciones.schema";

export const tiposActualizacion = mysqlTable("tipos_actualizacion", {
  id: int("id").autoincrement().primaryKey(),
  nombre: varchar("nombre", { length: 50 }).notNull(), // "manual", "documento"
});

export const tiposActualizacionRelations = relations(tiposActualizacion, ({ many }) => ({
  actualizaciones: many(actualizaciones),
}));

// ============================================
// Interfaces
// ============================================

/** TipoActualizacion table row type */
export interface TipoActualizacion {
  id: number;
  nombre: string;
}

/** TipoActualizacion insert type */
export interface InsertTipoActualizacion {
  id?: number;
  nombre: string;
}
