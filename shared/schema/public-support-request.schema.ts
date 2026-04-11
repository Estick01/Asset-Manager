import { mysqlTable, varchar, text, mysqlEnum, timestamp } from "drizzle-orm/mysql-core";

export const publicSupportRequests = mysqlTable("public_support_requests", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 180 }).notNull(),
  message: text("message").notNull(),
  source: mysqlEnum("source", ["landing", "login"]).notNull(),
  status: mysqlEnum("status", ["new", "in_progress", "resolved", "spam"]).notNull().default("new"),
  userId: varchar("user_id", { length: 36 }),
  assignedAdminId: varchar("assigned_admin_id", { length: 36 }),
  conversationId: varchar("conversation_id", { length: 36 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  resolvedAt: timestamp("resolved_at"),
});

export type PublicSupportRequestSource = "landing" | "login";
export type PublicSupportRequestStatus = "new" | "in_progress" | "resolved" | "spam";

export interface PublicSupportRequest {
  id: string;
  name: string;
  email: string;
  message: string;
  source: PublicSupportRequestSource;
  status: PublicSupportRequestStatus;
  userId: string | null;
  assignedAdminId: string | null;
  conversationId: string | null;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
}

