import { mysqlTable, varchar, text, timestamp, json } from "drizzle-orm/mysql-core";

export const appNotifications = mysqlTable("app_notifications", {
  id:        varchar("id",      { length: 36  }).primaryKey(),
  userId:    varchar("user_id", { length: 36  }).notNull(),
  type:      varchar("type",    { length: 50  }).notNull().default("info"),
  title:     varchar("title",   { length: 255 }).notNull(),
  body:      text("body").notNull(),
  data:      json("data"),
  readAt:    timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export interface AppNotification {
  id:        string;
  userId:    string;
  type:      string;
  title:     string;
  body:      string;
  data:      Record<string, any> | null;
  readAt:    Date | null;
  createdAt: Date;
}
