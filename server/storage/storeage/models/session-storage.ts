import { eq, and, lt } from "drizzle-orm";
import { sessions, type InsertSession, type Session } from "@/shared/schema";
import type { Database } from "../database-storage";

export class SessionStorage {
  constructor(private db: Database) {}

  /** Create a new session on login */
  async create(data: InsertSession): Promise<void> {
    await this.db.insert(sessions).values(data);
  }

  /** Find session by JTI — used in authenticate middleware */
  async findById(jti: string): Promise<Session | undefined> {
    return this.db.query.sessions.findFirst({
      where: eq(sessions.id, jti),
    });
  }

  /** Check if a session is valid (exists, not expired, not revoked) */
  async isValid(jti: string): Promise<boolean> {
    const session = await this.findById(jti);
    if (!session) return false;
    if (session.revokedAt !== null) return false;
    if (session.expiresAt < new Date()) return false;
    return true;
  }

  /** Revoke a single session (logout) */
  async revoke(jti: string): Promise<void> {
    await this.db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(eq(sessions.id, jti));
  }

  /** Revoke all active sessions for a user (e.g. password change, account compromise) */
  async revokeAllForUser(userId: string): Promise<void> {
    await this.db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(sessions.userId, userId),
          // Only revoke non-already-revoked sessions
          eq(sessions.revokedAt, null as any)
        )
      );
  }

  /** Revoke all active sessions for one recognized device */
  async revokeAllForDevice(userId: string, deviceId: string): Promise<void> {
    await this.db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(sessions.userId, userId),
          eq(sessions.deviceId, deviceId),
          eq(sessions.revokedAt, null as any)
        )
      );
  }

  /** Find session by refresh token */
  async findByRefreshToken(refreshToken: string): Promise<Session | undefined> {
    return this.db.query.sessions.findFirst({
      where: eq(sessions.refreshToken, refreshToken),
    });
  }

  /**
   * Rotate refresh token: revoke old session and create a new one.
   * Call this on every successful token refresh to prevent replay attacks.
   */
  async rotate(
    oldJti: string,
    newJti: string,
    newRefreshToken: string,
    newExpiresAt: Date,
    newRefreshExpiresAt: Date,
  ): Promise<void> {
    // Revoke old session
    await this.db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(eq(sessions.id, oldJti));

    // Copy metadata from old session to new one
    const old = await this.findById(oldJti);
    await this.db.insert(sessions).values({
      id: newJti,
      userId: old!.userId,
      expiresAt: newExpiresAt,
      refreshToken: newRefreshToken,
      refreshExpiresAt: newRefreshExpiresAt,
      ipAddress: old?.ipAddress ?? null,
      userAgent: old?.userAgent ?? null,
      deviceId: old?.deviceId ?? null,
    });
  }

  /** Delete expired sessions (run periodically to keep table clean) */
  async deleteExpired(): Promise<void> {
    await this.db
      .delete(sessions)
      .where(lt(sessions.expiresAt, new Date()));
  }
}
