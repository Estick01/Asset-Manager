/**
 * Password Reset Routes
 *
 * POST /api/auth/request-password-reset  — send OTP to email
 * POST /api/auth/verify-otp              — validate OTP, return short-lived reset token
 * POST /api/auth/reset-password          — set new password using reset token
 */

import { Router, type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { storage } from "../storage/storeage/database-storage.js";
import { hashPassword } from "../auth.js";
import { sendPasswordResetOtp } from "../services/email.service.js";
import { rateLimit } from "../middleware/rate-limit.js";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET!;
const RESET_TOKEN_EXPIRES = "15m";
const RESET_TOKEN_TYPE    = "password_reset";

// ── Helpers ────────────────────────────────────────────────────────────────

function issueResetToken(userId: string): string {
  return jwt.sign({ sub: userId, type: RESET_TOKEN_TYPE }, JWT_SECRET, {
    expiresIn: RESET_TOKEN_EXPIRES,
  });
}

function verifyResetToken(token: string): { sub: string } | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    if (payload?.type !== RESET_TOKEN_TYPE) return null;
    return payload;
  } catch {
    return null;
  }
}

// ── Schemas ────────────────────────────────────────────────────────────────

const requestSchema = z.object({
  email: z.string().email(),
});

const verifySchema = z.object({
  email: z.string().email(),
  code:  z.string().length(6),
});

const resetSchema = z.object({
  resetToken:  z.string().min(1),
  newPassword: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

// ── POST /api/auth/request-password-reset ─────────────────────────────────

// Rate limit: max 5 intentos por IP cada 15 minutos
const resetRateLimit = rateLimit({ windowMs: 15 * 60_000, maxRequests: 5,
  message: "Demasiados intentos. Espera 15 minutos antes de volver a intentarlo." });

router.post(
  "/auth/request-password-reset",
  resetRateLimit,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = requestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }

      const { email } = parsed.data;

      // Always return 200 — never reveal if the email is registered
      const user = await storage.getUserByEmail(email);
      if (user && user.isActive) {
        const code = await storage.otps.createOtp(user.id);
        // Fire-and-forget — don't fail the request if email sending fails
        sendPasswordResetOtp(email, code).catch((err) =>
          console.error("[password-reset] email send error:", err)
        );
      }

      return res.json({
        message:
          "Si el correo está registrado, recibirás un código de verificación en breve.",
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/auth/verify-otp ─────────────────────────────────────────────

router.post(
  "/auth/verify-otp",
  resetRateLimit,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = verifySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }

      const { email, code } = parsed.data;

      // Generic error — don't reveal whether the email exists
      const GENERIC_ERROR = "Código inválido o expirado.";

      const user = await storage.getUserByEmail(email);
      if (!user || !user.isActive) {
        return res.status(400).json({ error: GENERIC_ERROR });
      }

      const result = await storage.otps.verifyOtp(user.id, code);

      if (result === "too_many_attempts") {
        return res
          .status(429)
          .json({ error: "Demasiados intentos fallidos. Solicita un nuevo código." });
      }

      if (result !== "valid") {
        return res.status(400).json({ error: GENERIC_ERROR });
      }

      // Issue short-lived reset token (15 min)
      const resetToken = issueResetToken(user.id);

      return res.json({ resetToken });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/auth/reset-password ─────────────────────────────────────────

router.post(
  "/auth/reset-password",
  resetRateLimit,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = resetSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }

      const { resetToken, newPassword } = parsed.data;

      const payload = verifyResetToken(resetToken);
      if (!payload) {
        return res
          .status(400)
          .json({ error: "El enlace de restablecimiento es inválido o ha expirado." });
      }

      const userId = payload.sub;

      // Mark the OTP as used so it cannot be reused
      await storage.otps.markUsed(userId);

      // Hash and persist new password
      const passwordHash = await hashPassword(newPassword);
      await storage.users.updateUser(userId, { passwordHash });

      // Revoke all active sessions — force re-login with new password
      await storage.sessions.revokeAllForUser(userId);

      return res.json({ message: "Contraseña actualizada correctamente." });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
