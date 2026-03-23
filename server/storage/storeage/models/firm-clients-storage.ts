import { randomUUID } from "crypto";
import { eq, and, desc } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { firmClients } from "@/shared/schema";
import type { FirmClient } from "@/shared/schema";

export class FirmClientsStorage {
  constructor(private db: MySql2Database<any>) {}

  async getActiveFirmClient(firmId: string, clientId: string): Promise<FirmClient | undefined> {
    const rows = await this.db
      .select()
      .from(firmClients)
      .where(and(eq(firmClients.firmId, firmId), eq(firmClients.clientId, clientId), eq(firmClients.status, "active")))
      .limit(1);
    return rows[0] as FirmClient | undefined;
  }

  /** Returns all active clientIds linked to a firm via firm_clients */
  async getActiveClientIdsByFirm(firmId: string): Promise<string[]> {
    const rows = await this.db
      .select({ clientId: firmClients.clientId })
      .from(firmClients)
      .where(and(eq(firmClients.firmId, firmId), eq(firmClients.status, "active")))
      .orderBy(desc(firmClients.createdAt));
    return rows.map(r => r.clientId);
  }

  async createFirmClient(firmId: string, clientId: string): Promise<FirmClient> {
    // If an inactive record exists, reactivate it instead of creating a duplicate
    const existing = await this.db
      .select()
      .from(firmClients)
      .where(and(eq(firmClients.firmId, firmId), eq(firmClients.clientId, clientId)))
      .limit(1);

    if (existing[0]) {
      await this.db
        .update(firmClients)
        .set({ status: "active" })
        .where(eq(firmClients.id, existing[0].id));
      const rows = await this.db.select().from(firmClients).where(eq(firmClients.id, existing[0].id)).limit(1);
      return rows[0] as FirmClient;
    }

    const id = randomUUID();
    await this.db.insert(firmClients).values({ id, firmId, clientId, status: "active" });
    const rows = await this.db.select().from(firmClients).where(eq(firmClients.id, id)).limit(1);
    return rows[0] as FirmClient;
  }

  /** Soft-delete: sets status = "inactive" */
  async deactivate(firmId: string, clientId: string): Promise<void> {
    await this.db
      .update(firmClients)
      .set({ status: "inactive" })
      .where(and(eq(firmClients.firmId, firmId), eq(firmClients.clientId, clientId)));
  }
}
