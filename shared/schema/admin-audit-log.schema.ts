/**
 * Admin Audit Log Schema
 * Registra acciones críticas realizadas por administradores del sistema.
 */
import { mysqlTable, int, varchar, text, timestamp, index } from "drizzle-orm/mysql-core";

export const adminAuditLog = mysqlTable(
  "admin_audit_log",
  {
    id:        int("id").autoincrement().primaryKey(),
    /** Referencia soft a users.id — sin FK intencional: los logs de auditoría persisten aunque el admin sea eliminado */
    adminId:   varchar("admin_id",  { length: 36 }).notNull(),
    accion:    varchar("accion",    { length: 100 }).notNull(),
    targetId:  varchar("target_id", { length: 36 }),
    detalle:   text("detalle"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_admin_id").on(table.adminId),
    index("idx_accion").on(table.accion),
    index("idx_created").on(table.createdAt),
  ],
);

export type AdminAuditLog       = typeof adminAuditLog.$inferSelect;
export type InsertAdminAuditLog = typeof adminAuditLog.$inferInsert;
