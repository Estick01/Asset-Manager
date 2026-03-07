/**
 * Lawyer-Clients Storage
 * Handles database operations for lawyer-client relationships
 */

import { LawyerClient, lawyerClients, InsertLawyerClient } from "@/shared/schema";
import { randomUUID } from "crypto";
import { eq, and, desc, inArray } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";

export class LawyerClientsStorage {
  constructor(private db: MySql2Database<any>) { }

  async getLawyerClients(lawyerId: string): Promise<LawyerClient[]> {
    const data = await this.db
      .select()
      .from(lawyerClients)
      .where(eq(lawyerClients.lawyerId, lawyerId))
      .orderBy(desc(lawyerClients.createdAt));
    return data;
  }

  async getClientLawyers(clientId: string): Promise<LawyerClient[]> {
    const data = await this.db
      .select()
      .from(lawyerClients)
      .where(eq(lawyerClients.clientId, clientId))
      .orderBy(desc(lawyerClients.createdAt));
    return data;
  }

  async getLawyerClientById(id: string): Promise<LawyerClient | undefined> {
    const result = await this.db
      .select()
      .from(lawyerClients)
      .where(eq(lawyerClients.id, id))
      .limit(1)
      .then(rows => rows[0]);
    return result;
  }

  async getActiveLawyerClient(lawyerId: string, clientId: string): Promise<LawyerClient | undefined> {
    const result = await this.db
      .select()
      .from(lawyerClients)
      .where(
        and(
          eq(lawyerClients.lawyerId, lawyerId),
          eq(lawyerClients.clientId, clientId),
          eq(lawyerClients.status, "active")
        )
      )
      .limit(1)
      .then(rows => rows[0]);
    return result;
  }

  async createLawyerClient(data: InsertLawyerClient): Promise<LawyerClient> {
    const id = randomUUID();
    const { id: _ignored, ...dataWithoutId } = data;
    const newLawyerClient = {
      id,
      ...dataWithoutId,
      status: data.status ?? "active",
      relationshipStartedAt: data.relationshipStartedAt ?? new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.db.insert(lawyerClients).values(newLawyerClient);

    const created = await this.db
      .select()
      .from(lawyerClients)
      .where(eq(lawyerClients.id, id))
      .limit(1)
      .then(rows => rows[0]);

    if (!created) {
      throw new Error("No se pudo crear la relación lawyer-client");
    }

    return created;
  }

  async updateLawyerClient(id: string, updates: Partial<InsertLawyerClient>): Promise<LawyerClient | undefined> {
    const dbUpdates: any = { ...updates };
    if (updates.relationshipStartedAt !== undefined) {
      dbUpdates.relationshipStartedAt = new Date(updates.relationshipStartedAt);
    }
    if (updates.relationshipEndedAt !== undefined) {
      dbUpdates.relationshipEndedAt = updates.relationshipEndedAt ? new Date(updates.relationshipEndedAt) : null;
    }
    dbUpdates.updatedAt = new Date();

    await this.db.update(lawyerClients).set(dbUpdates).where(eq(lawyerClients.id, id));
    return this.getLawyerClientById(id);
  }

  async terminateRelationship(id: string): Promise<LawyerClient | undefined> {
    return this.updateLawyerClient(id, {
      status: "terminated",
      relationshipEndedAt: new Date(),
    });
  }

  async deleteLawyerClient(id: string): Promise<void> {
    await this.db.delete(lawyerClients).where(eq(lawyerClients.id, id));
  }

  async getActiveClientsByLawyer(lawyerId: string): Promise<LawyerClient[]> {
    const data = await this.db
      .select()
      .from(lawyerClients)
      .where(
        and(
          eq(lawyerClients.lawyerId, lawyerId),
          eq(lawyerClients.status, "active")
        )
      )
      .orderBy(desc(lawyerClients.relationshipStartedAt));
    return data;
  }
}
