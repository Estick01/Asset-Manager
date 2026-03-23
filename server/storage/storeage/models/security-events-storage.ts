import { eq, desc } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { securityEvents, type InsertSecurityEvent, type SecurityEvent } from "../../../../shared/schema/security-audit.schema.js";

export class SecurityEventsStorage {
  constructor(private db: MySql2Database<any>) {}

  async create(data: InsertSecurityEvent): Promise<void> {
    await this.db.insert(securityEvents).values(data);
  }

  async getByEmail(email: string, limit = 50): Promise<SecurityEvent[]> {
    return this.db
      .select()
      .from(securityEvents)
      .where(eq(securityEvents.email, email))
      .orderBy(desc(securityEvents.createdAt))
      .limit(limit);
  }

  async getByIp(ip: string, limit = 50): Promise<SecurityEvent[]> {
    return this.db
      .select()
      .from(securityEvents)
      .where(eq(securityEvents.ip, ip))
      .orderBy(desc(securityEvents.createdAt))
      .limit(limit);
  }
}
