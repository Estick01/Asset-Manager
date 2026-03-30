import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { pagos, type Pago, type InsertPago, type EstadoPago } from "@/shared/schema";
import type { Database } from "../database-storage";

export class PagoStorage {
  constructor(private db: Database) {}

  async create(data: Omit<InsertPago, "id" | "createdAt">): Promise<Pago> {
    const id = randomUUID();
    await this.db.insert(pagos).values({ ...data, id });
    return (await this.getById(id))!;
  }

  async getById(id: string): Promise<Pago | null> {
    return this.db.select().from(pagos).where(eq(pagos.id, id)).limit(1).then(r => r[0] ?? null);
  }

  async getByReference(reference: string): Promise<Pago | null> {
    return this.db.select().from(pagos).where(eq(pagos.wompiReference, reference)).limit(1).then(r => r[0] ?? null);
  }

  async updateEstado(
    id: string,
    estado: EstadoPago,
    wompiTransactionId?: string,
    metodoPago?: string,
  ): Promise<void> {
    const updates: Partial<InsertPago> = { estado };
    if (wompiTransactionId) updates.wompiTransactionId = wompiTransactionId;
    if (metodoPago)         updates.metodoPago = metodoPago as any;
    await this.db.update(pagos).set(updates).where(eq(pagos.id, id));
  }
}
