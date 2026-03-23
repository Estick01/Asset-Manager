import { mysqlTable, varchar, mysqlEnum, timestamp } from "drizzle-orm/mysql-core";

export const firmClients = mysqlTable("firm_clients", {
  id:        varchar("id",        { length: 36 }).primaryKey(),
  firmId:    varchar("firm_id",   { length: 36 }).notNull(),
  clientId:  varchar("client_id", { length: 36 }).notNull(),
  status:    mysqlEnum("status", ["active","inactive"]).notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export interface FirmClient {
  id:        string;
  firmId:    string;
  clientId:  string;
  status:    "active" | "inactive";
  createdAt: Date;
}
