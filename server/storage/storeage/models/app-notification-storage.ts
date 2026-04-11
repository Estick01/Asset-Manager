import { randomUUID } from "crypto";
import { eq, and, isNull, desc, count } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { appNotifications, users } from "@/shared/schema";
import type { AppNotification } from "@/shared/schema";
import { queueNotificationEmail } from "../../../services/email.service.js";

function joinAppUrl(path: string): string | undefined {
  const appUrl = process.env.APP_URL?.trim();
  if (!appUrl) return undefined;
  const base = appUrl.endsWith("/") ? appUrl.slice(0, -1) : appUrl;
  const nextPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${nextPath}`;
}

function buildNotificationLink(data?: Record<string, any>): { actionUrl?: string; actionLabel?: string } {
  if (!data) return {};
  if (typeof data.route === "string" && data.route) {
    return { actionUrl: joinAppUrl(data.route), actionLabel: "Abrir soporte" };
  }
  if (typeof data.postId === "string" && data.postId) {
    return { actionUrl: joinAppUrl(`/community/${data.postId}`), actionLabel: "Ver publicación" };
  }
  if (typeof data.procesoId === "string" && data.procesoId) {
    return { actionUrl: joinAppUrl(`/case/${data.procesoId}`), actionLabel: "Ver proceso" };
  }
  return {};
}

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
    const userRows = await this.db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    queueNotificationEmail(userRows[0]?.email, title, body, buildNotificationLink(data));
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
