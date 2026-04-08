import { mysqlTable, varchar, boolean, timestamp, int } from "drizzle-orm/mysql-core";

export const passwordResetOtps = mysqlTable("password_reset_otps", {
  id:        varchar("id",      { length: 36 }).primaryKey(),
  userId:    varchar("user_id", { length: 36 }).notNull(),
  code:      varchar("code",    { length: 6  }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  isUsed:    boolean("is_used").notNull().default(false),
  attempts:  int("attempts").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type PasswordResetOtp = typeof passwordResetOtps.$inferSelect;

export const emailVerificationOtps = mysqlTable("email_verification_otps", {
  id:        varchar("id",      { length: 36 }).primaryKey(),
  userId:    varchar("user_id", { length: 36 }).notNull(),
  code:      varchar("code",    { length: 6  }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  isUsed:    boolean("is_used").notNull().default(false),
  attempts:  int("attempts").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type EmailVerificationOtp = typeof emailVerificationOtps.$inferSelect;
