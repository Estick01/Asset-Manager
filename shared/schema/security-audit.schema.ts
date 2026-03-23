import { mysqlTable, varchar, boolean, timestamp, text } from "drizzle-orm/mysql-core";

export type SecurityEventType =
  | "login_success"
  | "login_fail"
  | "login_blocked"
  | "login_blocked_user"
  | "suspicious_ip";

export const securityEvents = mysqlTable("security_events", {
  id:        varchar("id",         { length: 36 }).primaryKey(),
  email:     varchar("email",      { length: 255 }).notNull(),
  ip:        varchar("ip",         { length: 45  }).notNull(),
  userAgent: varchar("user_agent", { length: 500 }),
  eventType: varchar("event_type", { length: 32  }).notNull(), // SecurityEventType
  success:   boolean("success").notNull().default(false),
  metadata:  text("metadata"),  // JSON string for extra context
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type SecurityEvent       = typeof securityEvents.$inferSelect;
export type InsertSecurityEvent = typeof securityEvents.$inferInsert;
