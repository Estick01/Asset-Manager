import { InsertPlan, Plan, planes } from "@/shared/schema";
import { eq } from "drizzle-orm";



export class PlanStorage {
  constructor(private db: any) {}

  async getPlan(id: string): Promise<Plan | undefined> {
    return this.db.query.planes.findFirst({
      where: eq(planes.id, id),
    });
  }

  async getPlanes(): Promise<Plan[]> {
    return this.db.query.planes.findMany();
  }

  async createPlan(insertPlan: InsertPlan): Promise<Plan> {
    const newPlan = {
      ...insertPlan,
      state: insertPlan.state ?? true,
    };

    await this.db.insert(planes).values(newPlan);

    return newPlan as Plan;
  }

  async updatePlan(id: string, data: Partial<Plan>): Promise<Plan | undefined> {
    await this.db
      .update(planes)
      .set(data)
      .where(eq(planes.id, id));

    return this.getPlan(id);
  }

  async deletePlan(id: string): Promise<void> {
    await this.db.delete(planes).where(eq(planes.id, id));
  }
}