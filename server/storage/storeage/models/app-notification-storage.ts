import { randomUUID } from "crypto";
import { eq, and, isNull, desc, count } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { appNotifications } from "@/shared/schema";
import type { AppNotification } from "@/shared/schema";

export class AppNotificationStorage {
  constructor(private db: MySql2Database<any>) {}

  async createNotification(
    userId: string,
    type: string,
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<AppNotification> {
    const id = randomUUID();
    await this.db.insert(appNotifications).values({ id, userId, type, title, body, data: data ?? null });
    const rows = await this.db.select().from(appNotifications).where(eq(appNotifications.id, id)).limit(1);
    return rows[0] as AppNotification;
  }

  async getForUser(userId: string, limit = 50): Promise<AppNotification[]> {
    const rows = await this.db
      .select()
      .from(appNotifications)
      .where(eq(appNotifications.userId, userId))
      .orderBy(desc(appNotifications.createdAt))
      .limit(limit);
    return rows as AppNotification[];
  }

  async getUnreadCount(userId: string): Promise<number> {
    const rows = await this.db
      .select({ n: count() })
      .from(appNotifications)
      .where(and(eq(appNotifications.userId, userId), isNull(appNotifications.readAt)));
    return rows[0]?.n ?? 0;
  }

  async markRead(id: string, userId: string): Promise<void> {
    await this.db
      .update(appNotifications)
      .set({ readAt: new Date() })
      .where(and(eq(appNotifications.id, id), eq(appNotifications.userId, userId)));
  }

  async markAllRead(userId: string): Promise<void> {
    await this.db
      .update(appNotifications)
      .set({ readAt: new Date() })
      .where(and(eq(appNotifications.userId, userId), isNull(appNotifications.readAt)));
  }
}
