import { relations } from "drizzle-orm";
import { index, mysqlTable, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";
import { users } from "./user.schema";

export const userDevices = mysqlTable("user_devices", {
  id:         varchar("id",         { length: 36 }).primaryKey(),
  userId:     varchar("user_id",    { length: 36 }).notNull(),
  deviceId:   varchar("device_id",  { length: 191 }).notNull(),
  deviceName: varchar("device_name",{ length: 120 }),
  platform:   varchar("platform",   { length: 30 }),
  userAgent:  varchar("user_agent", { length: 500 }),
  lastIp:     varchar("last_ip",    { length: 45 }),
  firstSeenAt: timestamp("first_seen_at").notNull().defaultNow(),
  lastSeenAt:  timestamp("last_seen_at").notNull().defaultNow(),
  trustedAt:   timestamp("trusted_at").notNull().defaultNow(),
  revokedAt:   timestamp("revoked_at"),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
  updatedAt:   timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
}, (table) => ({
  userDeviceUnique: uniqueIndex("user_devices_user_device_unique").on(table.userId, table.deviceId),
  userLastSeenIdx:  index("user_devices_user_last_seen_idx").on(table.userId, table.lastSeenAt),
}));

export const userDevicesRelations = relations(userDevices, ({ one }) => ({
  user: one(users, {
    fields: [userDevices.userId],
    references: [users.id],
  }),
}));

export type UserDevice = typeof userDevices.$inferSelect;
export type InsertUserDevice = typeof userDevices.$inferInsert;
