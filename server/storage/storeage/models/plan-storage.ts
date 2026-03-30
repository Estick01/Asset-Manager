import { eq } from "drizzle-orm";
import { planes, planFeatures, features, type Plan, type InsertPlan, type PlanPublicoDTO } from "@/shared/schema";
import type { Database } from "../database-storage";

export class PlanStorage {
  constructor(private db: Database) {}

  async getPlan(id: string): Promise<Plan | undefined> {
    return this.db.select().from(planes).where(eq(planes.id, id)).limit(1).then(r => r[0]);
  }

  async getPlanes(tipo?: "abogado" | "bufete"): Promise<Plan[]> {
    if (tipo) {
      return this.db.select().from(planes).where(eq(planes.tipo, tipo));
    }
    return this.db.select().from(planes).where(eq(planes.state, true));
  }

  async getPlanesPublicos(tipo?: "abogado" | "bufete"): Promise<PlanPublicoDTO[]> {
    const listPlanes = await this.getPlanes(tipo);
    const result: PlanPublicoDTO[] = [];

    for (const p of listPlanes) {
      const featureRows = await this.db
        .select({ code: planFeatures.featureCode, nombre: features.nombre, value: planFeatures.value })
        .from(planFeatures)
        .innerJoin(features, eq(planFeatures.featureCode, features.code))
        .where(eq(planFeatures.planId, p.id));

      result.push({
        id:                    p.id,
        nombre:                p.nombre,
        tipo:                  p.tipo,
        precioMensualCop:      p.precioMensualCop,
        precioAnualCop:        p.precioAnualCop,
        precioMensualUsd:      p.precioMensualUsd,
        precioAnualUsd:        p.precioAnualUsd,
        maxProcesos:           p.maxProcesos,
        maxClientes:           p.maxClientes,
        maxStorageGb:          p.maxStorageGb,
        includedUsers:         p.includedUsers,
        maxUsers:              p.maxUsers,
        precioUsuarioExtraCop: p.precioUsuarioExtraCop ?? null,
        precioUsuarioExtraUsd: p.precioUsuarioExtraUsd ?? null,
        features:              featureRows,
      });
    }
    return result;
  }

  /** Compatibilidad legacy — usado por server/index.ts seedDatabase() */
  async createPlan(insertPlan: Partial<InsertPlan> & { id: string; nombre: string }): Promise<Plan> {
    const newPlan = {
      id:               insertPlan.id,
      nombre:           insertPlan.nombre,
      tipo:             (insertPlan as any).tipo ?? "abogado",
      precioMensualCop: (insertPlan as any).precio ?? "0",
      precioAnualCop:   "0",
      precioMensualUsd: "0",
      precioAnualUsd:   "0",
      maxProcesos:      5,
      maxClientes:      10,
      maxStorageGb:     0,
      includedUsers:    1,
      maxUsers:         1,
      state:            insertPlan.state ?? true,
    } as InsertPlan;
    await this.db.insert(planes).values(newPlan);
    return (await this.getPlan(insertPlan.id))!;
  }

  async updatePlan(id: string, data: Partial<Plan>): Promise<Plan | undefined> {
    await this.db.update(planes).set(data).where(eq(planes.id, id));
    return this.getPlan(id);
  }

  async deletePlan(id: string): Promise<void> {
    await this.db.delete(planes).where(eq(planes.id, id));
  }
}
