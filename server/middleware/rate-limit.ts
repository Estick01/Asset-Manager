/**
 * Rate Limiting Middleware
 *
 * login:    checkLoginBlocked  →  use loginSecurity service in the route handler
 * general:  apiRateLimiter     →  lightweight in-memory guard for all API routes
 *
 * The heavy lifting (Redis, progressive blocks, audit) lives in
 * server/services/login-security.service.ts
 */

import type { Request, Response, NextFunction } from "express";
import { checkLoginAllowed } from "../services/login-security.service.js";

// ── Login pre-check middleware ────────────────────────────────────────────────

/**
 * Runs BEFORE credential validation.
 * Rejects the request immediately if the IP+email combo or the user account
 * is currently blocked due to too many failed attempts.
 */
export async function checkLoginBlocked(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const email = (req.body?.correo ?? req.body?.email ?? "").toString().toLowerCase().trim();
    const ip    = req.ip ?? req.socket.remoteAddress ?? "unknown";

    if (!email) { next(); return; } // validation will reject it downstream

    const result = await checkLoginAllowed(ip, email);

    if (result.blocked) {
      res.setHeader("Retry-After", String(result.retryAfterSec));
      res.status(429).json({
        error:       "Demasiados intentos fallidos. Intenta de nuevo más tarde.",
        retryAfter:  result.retryAfterSec,
        blockedBy:   result.reason,
      });
      return;
    }

    next();
  } catch (err) {
    // Never block a login request due to rate-limiter errors
    console.error("[rate-limit] checkLoginBlocked error:", err);
    next();
  }
}

// Keep export name used in existing routes
export const loginRateLimiter = checkLoginBlocked;

// ── General API rate limiter (in-memory, lightweight) ────────────────────────

const store = new Map<string, { count: number; resetAt: number }>();

// Cleanup every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, rec] of store) {
    if (now > rec.resetAt) store.delete(key);
  }
}, 10 * 60 * 1000);

export function rateLimit(options: {
  windowMs?:   number;
  maxRequests?: number;
  message?:    string;
} = {}) {
  const windowMs   = options.windowMs   ?? 60_000;
  const maxReqs    = options.maxRequests ?? 100;
  const message    = options.message    ?? "Demasiadas solicitudes. Intenta de nuevo más tarde.";

  return (req: Request, res: Response, next: NextFunction) => {
    const ip  = req.ip ?? req.socket.remoteAddress ?? "unknown";
    const key = `${ip}:${req.path}`;
    const now = Date.now();

    const rec = store.get(key);
    if (!rec || now > rec.resetAt) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      next(); return;
    }
    if (rec.count >= maxReqs) {
      const retryAfter = Math.ceil((rec.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfter));
      res.status(429).json({ error: message, retryAfter });
      return;
    }
    rec.count++;
    next();
  };
}

export const apiRateLimiter = rateLimit({
  windowMs:    60_000,
  maxRequests: 100,
});

// Strict limiter for account registration — 3 per 15 min per IP
export const registerRateLimiter = rateLimit({
  windowMs:    15 * 60_000,
  maxRequests: 3,
  message: "Demasiadas solicitudes de registro. Intenta de nuevo en 15 minutos.",
});
