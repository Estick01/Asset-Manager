import crypto from "crypto";
import { and, eq, gt, lt } from "drizzle-orm";
import { passwordResetOtps, type PasswordResetOtp } from "@/shared/schema";

const OTP_EXPIRES_MINUTES = 5;
const MAX_ATTEMPTS = 3;

export class OtpStorage {
  constructor(private db: any) {}

  /** Generate a 6-digit code and persist it. Invalidates any prior unused OTPs for the user. */
  async createOtp(userId: string): Promise<string> {
    // Invalidate all prior OTPs for this user so only the latest is valid
    await this.db
      .update(passwordResetOtps)
      .set({ isUsed: true })
      .where(and(eq(passwordResetOtps.userId, userId), eq(passwordResetOtps.isUsed, false)));

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + OTP_EXPIRES_MINUTES * 60 * 1000);

    await this.db.insert(passwordResetOtps).values({
      id:        crypto.randomUUID(),
      userId,
      code,
      expiresAt,
      isUsed:    false,
      attempts:  0,
    });

    return code;
  }

  /** Validate an OTP for a given userId+code.
   *  Returns: "valid" | "invalid" | "expired" | "used" | "too_many_attempts"
   */
  async verifyOtp(
    userId: string,
    code: string
  ): Promise<"valid" | "invalid" | "expired" | "used" | "too_many_attempts"> {
    const rows = await this.db
      .select()
      .from(passwordResetOtps)
      .where(
        and(
          eq(passwordResetOtps.userId, userId),
          eq(passwordResetOtps.isUsed, false),
        )
      )
      .orderBy(passwordResetOtps.createdAt)
      .limit(1);

    const otp: PasswordResetOtp | undefined = rows[rows.length - 1] ?? rows[0];
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
        .update(passwordResetOtps)
        .set({ attempts: otp.attempts + 1 })
        .where(eq(passwordResetOtps.id, otp.id));
      return "invalid";
    }

    return "valid";
  }

  /** Mark the latest unused OTP for this user as used */
  async markUsed(userId: string): Promise<void> {
    await this.db
      .update(passwordResetOtps)
      .set({ isUsed: true })
      .where(and(eq(passwordResetOtps.userId, userId), eq(passwordResetOtps.isUsed, false)));
  }

  /** Delete all expired OTPs (for cleanup cron) */
  async deleteExpired(): Promise<void> {
    await this.db
      .delete(passwordResetOtps)
      .where(lt(passwordResetOtps.expiresAt, new Date()));
  }
}
