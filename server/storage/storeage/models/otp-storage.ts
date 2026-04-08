import crypto from "crypto";
import { and, eq, gt, lt } from "drizzle-orm";
import {
  passwordResetOtps,
  emailVerificationOtps,
  type PasswordResetOtp,
  type EmailVerificationOtp,
} from "@/shared/schema";

const OTP_EXPIRES_MINUTES = 5;
const MAX_ATTEMPTS = 3;

export class OtpStorage {
  constructor(private db: any) {}

  private async createOtpForTable(table: typeof passwordResetOtps | typeof emailVerificationOtps, userId: string): Promise<string> {
    // Invalidate all prior OTPs for this user so only the latest is valid
    await this.db
      .update(table)
      .set({ isUsed: true })
      .where(and(eq(table.userId, userId), eq(table.isUsed, false)));

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + OTP_EXPIRES_MINUTES * 60 * 1000);

    await this.db.insert(table).values({
      id:        crypto.randomUUID(),
      userId,
      code,
      expiresAt,
      isUsed:    false,
      attempts:  0,
    });

    return code;
  }

  private async verifyOtpForTable(
    table: typeof passwordResetOtps | typeof emailVerificationOtps,
    userId: string,
    code: string
  ): Promise<"valid" | "invalid" | "expired" | "used" | "too_many_attempts"> {
    const rows = await this.db
      .select()
      .from(table)
      .where(
        and(
          eq(table.userId, userId),
          eq(table.isUsed, false),
        )
      )
      .orderBy(table.createdAt)
      .limit(1);

    const otp = (rows[rows.length - 1] ?? rows[0]) as PasswordResetOtp | EmailVerificationOtp | undefined;
    if (!otp) return "invalid";

    if (otp.isUsed)                   return "used";
    if (otp.attempts >= MAX_ATTEMPTS) return "too_many_attempts";
    if (new Date() > otp.expiresAt)   return "expired";

    const otpBuf = Buffer.from(otp.code);
    const inputBuf = Buffer.from(code.padEnd(otp.code.length, "\0").slice(0, otp.code.length));
    const matches = otpBuf.length === inputBuf.length && crypto.timingSafeEqual(otpBuf, inputBuf);
    if (!matches) {
      // Increment attempts
      await this.db
        .update(table)
        .set({ attempts: otp.attempts + 1 })
        .where(eq(table.id, otp.id));
      return "invalid";
    }

    return "valid";
  }

  private async markUsedForTable(table: typeof passwordResetOtps | typeof emailVerificationOtps, userId: string): Promise<void> {
    await this.db
      .update(table)
      .set({ isUsed: true })
      .where(and(eq(table.userId, userId), eq(table.isUsed, false)));
  }

  async createOtp(userId: string): Promise<string> {
    return this.createOtpForTable(passwordResetOtps, userId);
  }

  async createEmailVerificationOtp(userId: string): Promise<string> {
    return this.createOtpForTable(emailVerificationOtps, userId);
  }

  async verifyOtp(userId: string, code: string): Promise<"valid" | "invalid" | "expired" | "used" | "too_many_attempts"> {
    return this.verifyOtpForTable(passwordResetOtps, userId, code);
  }

  async verifyEmailVerificationOtp(userId: string, code: string): Promise<"valid" | "invalid" | "expired" | "used" | "too_many_attempts"> {
    return this.verifyOtpForTable(emailVerificationOtps, userId, code);
  }

  async markUsed(userId: string): Promise<void> {
    await this.markUsedForTable(passwordResetOtps, userId);
  }

  async markEmailVerificationUsed(userId: string): Promise<void> {
    await this.markUsedForTable(emailVerificationOtps, userId);
  }

  /** Delete all expired OTPs (for cleanup cron) */
  async deleteExpired(): Promise<void> {
    await this.db
      .delete(passwordResetOtps)
      .where(lt(passwordResetOtps.expiresAt, new Date()));

    await this.db
      .delete(emailVerificationOtps)
      .where(lt(emailVerificationOtps.expiresAt, new Date()));
  }
}
