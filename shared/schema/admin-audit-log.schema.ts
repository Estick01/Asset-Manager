import { mysqlTable, int, varchar, text, timestamp, index } from "drizzle-orm/mysql-core";

export const adminAuditLog = mysqlTable(
  "admin_audit_log",
  {
    id:        int("id").autoincrement().primaryKey(),
    adminId:   varchar("admin_id",  { length: 36 }).notNull(),
    accion:    varchar("accion",    { length: 100 }).notNull(),
    targetId:  varchar("target_id", { length: 36 }),
    detalle:   text("detalle"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    adminIdIdx: index("idx_admin_id").on(table.adminId),
    accionIdx:  index("idx_accion").on(table.accion),
    createdIdx: index("idx_created").on(table.createdAt),
  }),
);

export type AdminAuditLog       = typeof adminAuditLog.$inferSelect;
export type InsertAdminAuditLog = typeof adminAuditLog.$inferInsert;
