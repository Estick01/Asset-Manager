import { relations } from "drizzle-orm";
import { mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";
import { users } from "./user.schema";

export const userTwoFactor = mysqlTable("user_two_factor", {
  userId:      varchar("user_id", { length: 36 }).primaryKey(),
  secret:      varchar("secret", { length: 128 }).notNull(),
  recoveryCodes: text("recovery_codes"),
  enabledAt:   timestamp("enabled_at"),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
  updatedAt:   timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export const userTwoFactorRelations = relations(userTwoFactor, ({ one }) => ({
  user: one(users, {
    fields: [userTwoFactor.userId],
    references: [users.id],
  }),
}));

export type UserTwoFactor = typeof userTwoFactor.$inferSelect;
export type InsertUserTwoFactor = typeof userTwoFactor.$inferInsert;
