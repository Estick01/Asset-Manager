import { relations } from "drizzle-orm";
import { index, mysqlTable, timestamp, varchar } from "drizzle-orm/mysql-core";
import { users } from "./user.schema";

export const authChallenges = mysqlTable("auth_challenges", {
  id:            varchar("id", { length: 36 }).primaryKey(),
  userId:        varchar("user_id", { length: 36 }).notNull(),
  challengeType: varchar("challenge_type", { length: 30 }).notNull(),
  deviceId:      varchar("device_id", { length: 191 }),
  ipAddress:     varchar("ip_address", { length: 45 }),
  userAgent:     varchar("user_agent", { length: 500 }),
  expiresAt:     timestamp("expires_at").notNull(),
  completedAt:   timestamp("completed_at"),
  createdAt:     timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userTypeIdx: index("auth_challenges_user_type_idx").on(table.userId, table.challengeType),
}));

export const authChallengesRelations = relations(authChallenges, ({ one }) => ({
  user: one(users, {
    fields: [authChallenges.userId],
    references: [users.id],
  }),
}));

export type AuthChallenge = typeof authChallenges.$inferSelect;
export type InsertAuthChallenge = typeof authChallenges.$inferInsert;
