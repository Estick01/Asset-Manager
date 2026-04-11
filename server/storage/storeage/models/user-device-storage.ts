import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { sessions, userDevices, type UserDevice } from "@/shared/schema";
import type { Database } from "../database-storage";

type UpsertSeenInput = {
  userId: string;
  deviceId: string;
  deviceName?: string | null;
  platform?: string | null;
  userAgent?: string | null;
  lastIp?: string | null;
};

export type UserDeviceListItem = UserDevice & {
  activeSessionCount: number;
  hasActiveSessions: boolean;
  isCurrentDevice: boolean;
};

export class UserDeviceStorage {
  constructor(private db: Database) {}

  async getByIdForUser(userId: string, id: string): Promise<UserDevice | undefined> {
    return this.db.query.userDevices.findFirst({
      where: and(eq(userDevices.userId, userId), eq(userDevices.id, id)),
    });
  }

  async getByDeviceId(userId: string, deviceId: string): Promise<UserDevice | undefined> {
    return this.db.query.userDevices.findFirst({
      where: and(eq(userDevices.userId, userId), eq(userDevices.deviceId, deviceId)),
    });
  }

  async upsertSeen(input: UpsertSeenInput): Promise<{ device: UserDevice; isNewDevice: boolean }> {
    const now = new Date();
    const existing = await this.getByDeviceId(input.userId, input.deviceId);

    if (existing) {
      await this.db
        .update(userDevices)
        .set({
          deviceName: input.deviceName ?? existing.deviceName ?? null,
          platform: input.platform ?? existing.platform ?? null,
          userAgent: input.userAgent ?? existing.userAgent ?? null,
          lastIp: input.lastIp ?? existing.lastIp ?? null,
          lastSeenAt: now,
          trustedAt: existing.trustedAt ?? now,
          revokedAt: null,
          updatedAt: now,
        })
        .where(eq(userDevices.id, existing.id));

      const device = await this.getByIdForUser(input.userId, existing.id);
      return { device: device!, isNewDevice: false };
    }

    const id = randomUUID();
    await this.db.insert(userDevices).values({
      id,
      userId: input.userId,
      deviceId: input.deviceId,
      deviceName: input.deviceName ?? null,
      platform: input.platform ?? null,
      userAgent: input.userAgent ?? null,
      lastIp: input.lastIp ?? null,
      firstSeenAt: now,
      lastSeenAt: now,
      trustedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    const device = await this.getByIdForUser(input.userId, id);
    return { device: device!, isNewDevice: true };
  }

  async listForUser(userId: string, currentDeviceRowId?: string | null): Promise<UserDeviceListItem[]> {
    const [devices, activeSessions] = await Promise.all([
      this.db
        .select()
        .from(userDevices)
        .where(eq(userDevices.userId, userId))
        .orderBy(desc(userDevices.lastSeenAt)),
      this.db
        .select({
          deviceId: sessions.deviceId,
          count: sql<number>`count(*)`,
        })
        .from(sessions)
        .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)))
        .groupBy(sessions.deviceId),
    ]);

    const counts = new Map<string, number>();
    for (const row of activeSessions) {
      if (row.deviceId) counts.set(row.deviceId, Number(row.count) || 0);
    }

    return devices.map((device) => {
      const activeSessionCount = counts.get(device.deviceId) ?? 0;
      return {
        ...device,
        activeSessionCount,
        hasActiveSessions: activeSessionCount > 0,
        isCurrentDevice: currentDeviceRowId === device.id,
      };
    });
  }

  async revokeById(userId: string, id: string): Promise<UserDevice | undefined> {
    const device = await this.getByIdForUser(userId, id);
    if (!device) return undefined;

    const now = new Date();
    await this.db
      .update(userDevices)
      .set({
        revokedAt: now,
        updatedAt: now,
      })
      .where(eq(userDevices.id, id));

    await this.db
      .update(sessions)
      .set({ revokedAt: now })
      .where(
        and(
          eq(sessions.userId, userId),
          eq(sessions.deviceId, device.deviceId),
          isNull(sessions.revokedAt),
        )
      );

    return this.getByIdForUser(userId, id);
  }
}
