import { eq } from "drizzle-orm";
import { userTwoFactor, type UserTwoFactor } from "@/shared/schema";
import type { Database } from "../database-storage";

export class UserTwoFactorStorage {
  constructor(private db: Database) {}

  async getByUserId(userId: string): Promise<UserTwoFactor | undefined> {
    return this.db.query.userTwoFactor.findFirst({
      where: eq(userTwoFactor.userId, userId),
    });
  }

  async upsertSecret(userId: string, secret: string): Promise<UserTwoFactor | undefined> {
    const existing = await this.getByUserId(userId);
    const now = new Date();

    if (existing) {
      await this.db
        .update(userTwoFactor)
        .set({
          secret,
          enabledAt: null,
          recoveryCodes: null,
          updatedAt: now,
        })
        .where(eq(userTwoFactor.userId, userId));
    } else {
      await this.db.insert(userTwoFactor).values({
        userId,
        secret,
        enabledAt: null,
        recoveryCodes: null,
        createdAt: now,
        updatedAt: now,
      });
    }

    return this.getByUserId(userId);
  }

  async enable(userId: string, secret: string, recoveryCodes: string[]): Promise<UserTwoFactor | undefined> {
    const existing = await this.getByUserId(userId);
    const now = new Date();
    const recoveryCodesJson = JSON.stringify(recoveryCodes);

    if (existing) {
      await this.db
        .update(userTwoFactor)
        .set({
          secret,
          recoveryCodes: recoveryCodesJson,
          enabledAt: now,
          updatedAt: now,
        })
        .where(eq(userTwoFactor.userId, userId));
    } else {
      await this.db.insert(userTwoFactor).values({
        userId,
        secret,
        recoveryCodes: recoveryCodesJson,
        enabledAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }

    return this.getByUserId(userId);
  }

  async updateRecoveryCodes(userId: string, recoveryCodes: string[]): Promise<UserTwoFactor | undefined> {
    await this.db
      .update(userTwoFactor)
      .set({
        recoveryCodes: JSON.stringify(recoveryCodes),
        updatedAt: new Date(),
      })
      .where(eq(userTwoFactor.userId, userId));

    return this.getByUserId(userId);
  }

  async disable(userId: string): Promise<void> {
    await this.db
      .delete(userTwoFactor)
      .where(eq(userTwoFactor.userId, userId));
  }
}
