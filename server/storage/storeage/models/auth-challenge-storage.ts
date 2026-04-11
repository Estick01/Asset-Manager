import { and, eq, gt, isNull, lt } from "drizzle-orm";
import { authChallenges, type AuthChallenge, type InsertAuthChallenge } from "@/shared/schema";
import type { Database } from "../database-storage";

export class AuthChallengeStorage {
  constructor(private db: Database) {}

  async create(data: InsertAuthChallenge): Promise<void> {
    await this.db.insert(authChallenges).values(data);
  }

  async getValidById(id: string): Promise<AuthChallenge | undefined> {
    return this.db.query.authChallenges.findFirst({
      where: and(
        eq(authChallenges.id, id),
        isNull(authChallenges.completedAt),
        gt(authChallenges.expiresAt, new Date()),
      ),
    });
  }

  async complete(id: string): Promise<void> {
    await this.db
      .update(authChallenges)
      .set({ completedAt: new Date() })
      .where(eq(authChallenges.id, id));
  }

  async deleteExpired(): Promise<void> {
    await this.db
      .delete(authChallenges)
      .where(
        and(
          lt(authChallenges.expiresAt, new Date()),
          isNull(authChallenges.completedAt),
        )
      );
  }
}
