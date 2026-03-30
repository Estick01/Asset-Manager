import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import {
  suscripciones,
  type Suscripcion, type InsertSuscripcion,
  type CicloSuscripcion, type EstadoSuscripcion,
} from "@/shared/schema";
import type { Database } from "../database-storage";

export class SuscripcionStorage {
  constructor(private db: Database) {}

  async getActive(userId: string): Promise<Suscripcion | null> {
    const row = await this.db
      .select()
      .from(suscripciones)
      .where(and(eq(suscripciones.userId, userId), eq(suscripciones.estado, "activa")))
      .limit(1)
      .then(r => r[0] ?? null);
    return row;
  }

  async getById(id: string): Promise<Suscripcion | null> {
    return this.db.select().from(suscripciones).where(eq(suscripciones.id, id)).limit(1).then(r => r[0] ?? null);
  }

  async getByUserId(userId: string): Promise<Suscripcion[]> {
    return this.db.select().from(suscripciones).where(eq(suscripciones.userId, userId));
  }

  async create(data: Omit<InsertSuscripcion, "id" | "createdAt">): Promise<Suscripcion> {
    const id = randomUUID();
    await this.db.insert(suscripciones).values({ ...data, id });
    return (await this.getById(id))!;
  }

  async updateEstado(id: string, estado: EstadoSuscripcion, fechaCancelacion?: Date): Promise<void> {
    const updates: Partial<InsertSuscripcion> = { estado };
    if (fechaCancelacion) updates.fechaCancelacion = fechaCancelacion;
    await this.db.update(suscripciones).set(updates).where(eq(suscripciones.id, id));
  }

  async cancelAutoRenovacion(id: string): Promise<void> {
    await this.db
      .update(suscripciones)
      .set({ autoRenovacion: false, fechaCancelacion: new Date() })
      .where(eq(suscripciones.id, id));
  }

  /** Suscripciones activas cuyo vencimiento es en <= diasAntes días (para cron) */
  async getProximasAVencer(diasAntes: number): Promise<Suscripcion[]> {
    const limite = new Date();
    limite.setDate(limite.getDate() + diasAntes);
    const ahora = new Date();

    const { sql } = await import("drizzle-orm");
    return this.db
      .select()
      .from(suscripciones)
      .where(
        and(
          eq(suscripciones.estado, "activa"),
          sql`${suscripciones.fechaVencimiento} BETWEEN ${ahora} AND ${limite}`,
        ),
      );
  }

  /** Suscripciones activas que ya vencieron (para degradar a gratis) */
  async getVencidas(): Promise<Suscripcion[]> {
    const ahora = new Date();
    const { sql } = await import("drizzle-orm");
    return this.db
      .select()
      .from(suscripciones)
      .where(
        and(
          eq(suscripciones.estado, "activa"),
          sql`${suscripciones.fechaVencimiento} < ${ahora}`,
        ),
      );
  }
}
