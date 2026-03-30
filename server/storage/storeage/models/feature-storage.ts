import { eq, and } from "drizzle-orm";
import { features, planFeatures, type Feature, type PlanFeature } from "@/shared/schema";
import type { Database } from "../database-storage";

export class FeatureStorage {
  constructor(private db: Database) {}

  async getAll(): Promise<Feature[]> {
    return this.db.select().from(features).where(eq(features.state, true));
  }

  async getByPlan(planId: string): Promise<{ code: string; nombre: string; value: string }[]> {
    const rows = await this.db
      .select({
        code:   planFeatures.featureCode,
        nombre: features.nombre,
        value:  planFeatures.value,
      })
      .from(planFeatures)
      .innerJoin(features, eq(planFeatures.featureCode, features.code))
      .where(and(eq(planFeatures.planId, planId), eq(features.state, true)));
    return rows;
  }

  async hasFeature(planId: string, featureCode: string): Promise<{ has: boolean; value: string }> {
    const row = await this.db
      .select()
      .from(planFeatures)
      .where(and(eq(planFeatures.planId, planId), eq(planFeatures.featureCode, featureCode)))
      .limit(1)
      .then(r => r[0] ?? null);

    if (!row) return { has: false, value: "false" };
    return { has: row.value !== "false" && row.value !== "0", value: row.value };
  }

  async upsertFeature(planId: string, featureCode: string, value: string): Promise<void> {
    const existing = await this.db
      .select()
      .from(planFeatures)
      .where(and(eq(planFeatures.planId, planId), eq(planFeatures.featureCode, featureCode)))
      .limit(1)
      .then(r => r[0] ?? null);

    if (existing) {
      await this.db
        .update(planFeatures)
        .set({ value })
        .where(and(eq(planFeatures.planId, planId), eq(planFeatures.featureCode, featureCode)));
    } else {
      await this.db.insert(planFeatures).values({ planId, featureCode, value });
    }
  }
}
