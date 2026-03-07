/**
 * Rate Limiting Middleware
 * 
 * Provides rate limiting for sensitive endpoints like login.
 * Uses in-memory store (for production, use Redis).
 */

import type { Request, Response, NextFunction } from "express";

// In-memory store for rate limiting (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Configuration
const DEFAULT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const DEFAULT_MAX_REQUESTS = 5; // 5 attempts

interface RateLimitOptions {
  windowMs?: number;
  maxRequests?: number;
  message?: string;
}

/**
 * Creates a rate limiter middleware
 */
export function rateLimit(options: RateLimitOptions = {}) {
  const {
    windowMs = DEFAULT_WINDOW_MS,
    maxRequests = DEFAULT_MAX_REQUESTS,
    message = "Too many attempts, please try again later",
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    // Use IP + endpoint as key
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const key = `${ip}:${req.path}`;
    const now = Date.now();

    const record = rateLimitStore.get(key);

    if (!record || now > record.resetTime) {
      // New window
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      next();
      return;
    }

    if (record.count >= maxRequests) {
      // Rate limit exceeded
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader("Retry-After", retryAfter.toString());
      res.status(429).json({
        error: message,
        retryAfter,
      });
      return;
    }

    // Increment count
    record.count++;
    rateLimitStore.set(key, record);
    next();
  };
}

/**
 * Rate limiter specifically for login attempts
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 attempts
  message: "Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos.",
});

/**
 * Rate limiter for general API requests
 */
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // 100 requests per minute
  message: "Demasiadas solicitudes. Intenta de nuevo más tarde.",
});

/**
 * Cleanup old entries periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60 * 60 * 1000); // Cleanup every hour
