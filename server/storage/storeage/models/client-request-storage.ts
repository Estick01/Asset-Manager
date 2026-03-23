import { randomUUID } from "crypto";
import { eq, and, desc, lt, sql } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { clientRequests, users, roles } from "@/shared/schema";
import type { ClientRequest, ClientRequestWithSender } from "@/shared/schema";

export class ClientRequestStorage {
  constructor(private db: MySql2Database<any>) {}

  async createRequest(fromUserId: string, toUserId: string, expiresAt: Date): Promise<ClientRequest> {
    const id = randomUUID();
    await this.db.insert(clientRequests).values({
      id,
      fromUserId,
      toUserId,
      status: "pending",
      expiresAt,
    });
    const row = await this.db
      .select().from(clientRequests).where(eq(clientRequests.id, id)).limit(1);
    return row[0] as ClientRequest;
  }

  async getRequestById(id: string): Promise<ClientRequest | undefined> {
    const rows = await this.db
      .select().from(clientRequests).where(eq(clientRequests.id, id)).limit(1);
    return rows[0] as ClientRequest | undefined;
  }

  /** Latest request between this pair regardless of status */
  async getLatestRequest(fromUserId: string, toUserId: string): Promise<ClientRequest | undefined> {
    const rows = await this.db
      .select()
      .from(clientRequests)
      .where(and(eq(clientRequests.fromUserId, fromUserId), eq(clientRequests.toUserId, toUserId)))
      .orderBy(desc(clientRequests.createdAt))
      .limit(1);
    return rows[0] as ClientRequest | undefined;
  }

  async getPendingRequest(fromUserId: string, toUserId: string): Promise<ClientRequest | undefined> {
    const rows = await this.db
      .select()
      .from(clientRequests)
      .where(and(
        eq(clientRequests.fromUserId, fromUserId),
        eq(clientRequests.toUserId, toUserId),
        eq(clientRequests.status, "pending"),
      ))
      .limit(1);
    return rows[0] as ClientRequest | undefined;
  }

  /** All pending requests received by a user (for the client's notifications view) */
  async getPendingRequestsForUser(toUserId: string): Promise<ClientRequestWithSender[]> {
    const rows = await this.db
      .select({
        id:          clientRequests.id,
        fromUserId:  clientRequests.fromUserId,
        toUserId:    clientRequests.toUserId,
        status:      clientRequests.status,
        createdAt:   clientRequests.createdAt,
        expiresAt:   clientRequests.expiresAt,
        respondedAt: clientRequests.respondedAt,
        senderName:  users.name,
        senderRole:  roles.nombre,
      })
      .from(clientRequests)
      .innerJoin(users, eq(users.id, clientRequests.fromUserId))
      .leftJoin(roles, eq(roles.id, users.rolId))
      .where(and(
        eq(clientRequests.toUserId, toUserId),
        eq(clientRequests.status, "pending"),
      ))
      .orderBy(desc(clientRequests.createdAt));
    return rows as unknown as ClientRequestWithSender[];
  }

  async respondToRequest(id: string, status: "accepted" | "rejected" | "expired"): Promise<void> {
    await this.db
      .update(clientRequests)
      .set({ status, respondedAt: new Date() })
      .where(eq(clientRequests.id, id));
  }

  /** Bulk-expire all pending requests whose expires_at has passed */
  async expirePendingRequests(): Promise<void> {
    await this.db
      .update(clientRequests)
      .set({ status: "expired", respondedAt: new Date() })
      .where(and(
        eq(clientRequests.status, "pending"),
        lt(clientRequests.expiresAt, sql`NOW()`),
      ));
  }
}
