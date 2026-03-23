import { mysqlTable, varchar, mysqlEnum, timestamp } from "drizzle-orm/mysql-core";

export const clientRequests = mysqlTable("client_requests", {
  id:          varchar("id",           { length: 36 }).primaryKey(),
  fromUserId:  varchar("from_user_id", { length: 36 }).notNull(),
  toUserId:    varchar("to_user_id",   { length: 36 }).notNull(),
  status:      mysqlEnum("status", ["pending","accepted","rejected","expired"]).notNull().default("pending"),
  createdAt:   timestamp("created_at").defaultNow().notNull(),
  expiresAt:   timestamp("expires_at").notNull(),
  respondedAt: timestamp("responded_at"),
});

export type ClientRequestStatus = "pending" | "accepted" | "rejected" | "expired";

export interface ClientRequest {
  id:          string;
  fromUserId:  string;
  toUserId:    string;
  status:      ClientRequestStatus;
  createdAt:   Date;
  expiresAt:   Date;
  respondedAt: Date | null;
}

export interface ClientRequestWithSender extends ClientRequest {
  senderName: string;
  senderRole: string;
}
