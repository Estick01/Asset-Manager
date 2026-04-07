import { relations } from "drizzle-orm";
import { mysqlTable, timestamp, varchar } from "drizzle-orm/mysql-core";
import { users } from "./user.schema";

export const adminProfiles = mysqlTable("admin_profiles", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull().unique(),
  displayName: varchar("display_name", { length: 120 }).notNull(),
  adminType: varchar("admin_type", { length: 50 }).notNull(),
  createdAt: timestamp("created_at").notNull().default(new Date()),
  updatedAt: timestamp("updated_at").notNull().default(new Date()).onUpdateNow(),
});

export const adminProfilesRelations = relations(adminProfiles, ({ one }) => ({
  user: one(users, {
    fields: [adminProfiles.userId],
    references: [users.id],
  }),
}));

export interface AdminProfile {
  id: string;
  userId: string;
  displayName: string;
  adminType: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InsertAdminProfile {
  id: string;
  userId: string;
  displayName: string;
  adminType: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AdminProfileRelations extends AdminProfile {
  user: import("./user.schema").User | null;
}
