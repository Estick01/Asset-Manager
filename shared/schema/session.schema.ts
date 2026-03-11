import { mysqlTable, varchar, timestamp } from "drizzle-orm/mysql-core";
import { users } from "./user.schema";
import { relations } from "drizzle-orm";

export const sessions = mysqlTable("sessions", {
  /** JWT ID (jti claim) - used as primary key to look up / revoke tokens */
  id:                varchar("id",                 { length: 36  }).primaryKey(),
  userId:            varchar("user_id",            { length: 36  }).notNull(),
  expiresAt:         timestamp("expires_at").notNull(),
  revokedAt:         timestamp("revoked_at"),
  ipAddress:         varchar("ip_address",         { length: 45  }),
  userAgent:         varchar("user_agent",         { length: 500 }),
  createdAt:         timestamp("created_at").notNull().defaultNow(),
  /** Opaque refresh token - used to issue a new access token without re-login */
  refreshToken:      varchar("refresh_token",      { length: 64  }).unique(),
  refreshExpiresAt:  timestamp("refresh_expires_at"),
});

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields:     [sessions.userId],
    references: [users.id],
  }),
}));

export type Session = typeof sessions.$inferSelect;
export type InsertSession = typeof sessions.$inferInsert;
