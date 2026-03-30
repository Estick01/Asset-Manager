import { eq, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { usageTracking, type UsageTracking } from "@/shared/schema";
import type { Database } from "../database-storage";

export type UsageTipo = "procesos" | "clientes" | "storage";

const CAMPO: Record<UsageTipo, keyof typeof usageTracking.$inferSelect> = {
  procesos: "procesosUsados",
  clientes: "clientesUsados",
  storage:  "storageUsadoMb",
};

export class UsageTrackingStorage {
  constructor(private db: Database) {}

  async getByUserId(userId: string): Promise<UsageTracking | null> {
    return this.db
      .select().from(usageTracking).where(eq(usageTracking.userId, userId))
      .limit(1).then(r => r[0] ?? null);
  }

  async initForUser(userId: string, suscripcionId: string): Promise<void> {
    const existing = await this.getByUserId(userId);
    if (existing) {
      await this.db.update(usageTracking).set({ suscripcionId }).where(eq(usageTracking.userId, userId));
      return;
    }
    await this.db.insert(usageTracking).values({
      id: randomUUID(), userId, suscripcionId,
      procesosUsados: 0, clientesUsados: 0, storageUsadoMb: 0,
    });
  }

  async increment(userId: string, tipo: UsageTipo, cantidad = 1): Promise<void> {
    const col = CAMPO[tipo];
    await this.db
      .update(usageTracking)
      .set({ [col]: sql`${usageTracking[col]} + ${cantidad}` } as any)
      .where(eq(usageTracking.userId, userId));
  }

  async decrement(userId: string, tipo: UsageTipo, cantidad = 1): Promise<void> {
    const col = CAMPO[tipo];
    await this.db
      .update(usageTracking)
      .set({ [col]: sql`GREATEST(0, ${usageTracking[col]} - ${cantidad})` } as any)
      .where(eq(usageTracking.userId, userId));
  }

  async reset(userId: string): Promise<void> {
    await this.db
      .update(usageTracking)
      .set({ procesosUsados: 0, clientesUsados: 0, storageUsadoMb: 0 })
      .where(eq(usageTracking.userId, userId));
  }
}
