/**
 * Login Security Service
 *
 * Handles:
 *  - Progressive rate limiting (Redis-backed, multi-instance safe)
 *  - Per-combo (IP+email) and per-user (global) counters
 *  - Suspicious IP detection (many emails from one IP)
 *  - Security audit log (DB)
 *  - Optional reCAPTCHA v3 validation
 */

import { randomUUID } from "crypto";
import { redis } from "../lib/redis.js";
import { storage } from "../storage/storeage/database-storage.js";
import type { SecurityEventType } from "../../shared/schema/security-audit.schema.js";

// ── Constants ─────────────────────────────────────────────────────────────────

// Progressive block levels (attempts → block seconds)
const COMBO_LEVELS = [
  { threshold: 5,  blockSec: 15 * 60 },     // 15 min
  { threshold: 10, blockSec: 60 * 60 },     // 1 h
  { threshold: 20, blockSec: 24 * 60 * 60 },// 24 h
] as const;

const USER_LEVELS = [
  { threshold: 10, blockSec: 60 * 60 },     // 1 h
  { threshold: 20, blockSec: 24 * 60 * 60 },// 24 h
] as const;

// How long to keep the failure counter alive when no block is active (15 min window)
const COUNTER_TTL = 15 * 60;

// Suspicious IP: if 1 IP tries > this many distinct emails in 1 h
const SUSPICIOUS_EMAIL_THRESHOLD = 10;
const SUSPICIOUS_IP_TTL          = 60 * 60; // 1 h

// ── Redis key helpers ─────────────────────────────────────────────────────────
const k = {
  comboBan:  (ip: string, email: string) => `login:ban:combo:${ip}:${email}`,
  comboFail: (ip: string, email: string) => `login:fail:combo:${ip}:${email}`,
  userBan:   (email: string)             => `login:ban:user:${email}`,
  userFail:  (email: string)             => `login:fail:user:${email}`,
  ipEmails:  (ip: string)                => `login:ip:emails:${ip}`,
};

// ── Block level helper ────────────────────────────────────────────────────────
function resolveBlock(count: number, levels: readonly { threshold: number; blockSec: number }[]) {
  let blockSec = 0;
  for (const lvl of levels) {
    if (count >= lvl.threshold) blockSec = lvl.blockSec;
  }
  return blockSec;
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface BlockedResult {
  blocked: true;
  retryAfterSec: number;
  reason: "combo" | "user" | "suspicious_ip";
}

export interface AllowedResult {
  blocked: false;
}

export type CheckResult = BlockedResult | AllowedResult;

/**
 * Check if a login attempt should be blocked BEFORE processing credentials.
 */
export async function checkLoginAllowed(ip: string, email: string): Promise<CheckResult> {
  // 1. Combo ban
  const comboBan = await redis.get(k.comboBan(ip, email));
  if (comboBan) {
    const ttl = await redis.ttl(k.comboBan(ip, email));
    return { blocked: true, retryAfterSec: ttl > 0 ? ttl : 60, reason: "combo" };
  }

  // 2. User-global ban
  const userBan = await redis.get(k.userBan(email));
  if (userBan) {
    const ttl = await redis.ttl(k.userBan(email));
    return { blocked: true, retryAfterSec: ttl > 0 ? ttl : 60, reason: "user" };
  }

  // 3. Suspicious IP check
  const ipEmailCount = await redis.scard(k.ipEmails(ip));
  if (ipEmailCount >= SUSPICIOUS_EMAIL_THRESHOLD) {
    return { blocked: true, retryAfterSec: SUSPICIOUS_IP_TTL, reason: "suspicious_ip" };
  }

  return { blocked: false };
}

/**
 * Record a FAILED login attempt. Updates counters and sets block keys as needed.
 * Returns the block duration in seconds if a block was just triggered (0 = no new block).
 */
export async function recordFailure(ip: string, email: string): Promise<number> {
  // Track distinct emails per IP for suspicious IP detection
  await redis.sadd(k.ipEmails(ip), email);
  await redis.expire(k.ipEmails(ip), SUSPICIOUS_IP_TTL);

  // Combo counter (IP + email)
  const comboCount = await redis.incr(k.comboFail(ip, email));
  if (comboCount === 1) await redis.expire(k.comboFail(ip, email), COUNTER_TTL);

  // User-global counter (any IP)
  const userCount = await redis.incr(k.userFail(email));
  if (userCount === 1) await redis.expire(k.userFail(email), COUNTER_TTL);

  // Apply combo block if threshold reached
  const comboBlock = resolveBlock(comboCount, COMBO_LEVELS);
  if (comboBlock > 0) {
    const existingTTL = await redis.ttl(k.comboBan(ip, email));
    // Only upgrade the block if new duration is longer
    if (existingTTL < comboBlock) {
      await redis.set(k.comboBan(ip, email), "1", "EX", comboBlock);
    }
  }

  // Apply user-global block if threshold reached
  const userBlock = resolveBlock(userCount, USER_LEVELS);
  if (userBlock > 0) {
    const existingTTL = await redis.ttl(k.userBan(email));
    if (existingTTL < userBlock) {
      await redis.set(k.userBan(email), "1", "EX", userBlock);
    }
    return userBlock;
  }

  return comboBlock;
}

/**
 * Clear combo counter on successful login (but keep user-global to avoid abuse).
 */
export async function recordSuccess(ip: string, email: string): Promise<void> {
  await redis.del(k.comboFail(ip, email), k.comboBan(ip, email));
}

// ── Security audit log ───────────────────────────────────────────────────────

export async function auditLog(params: {
  email:     string;
  ip:        string;
  userAgent: string | null | undefined;
  eventType: SecurityEventType;
  success:   boolean;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await storage.securityEvents.create({
      id:        randomUUID(),
      email:     params.email,
      ip:        params.ip,
      userAgent: params.userAgent ?? null,
      eventType: params.eventType,
      success:   params.success,
      metadata:  params.metadata ? JSON.stringify(params.metadata) : null,
    });
  } catch (err) {
    // Audit failures must never break the login flow
    console.error("[security-audit] Failed to write event:", err);
  }
}

// ── Optional reCAPTCHA v3 ─────────────────────────────────────────────────────

const RECAPTCHA_SECRET  = process.env.RECAPTCHA_SECRET_KEY;
const RECAPTCHA_VERIFY  = "https://www.google.com/recaptcha/api/siteverify";
const RECAPTCHA_MIN_SCORE = Number(process.env.RECAPTCHA_MIN_SCORE ?? "0.5");

/**
 * Validates a reCAPTCHA v3 token.
 * Returns true if validation passes OR if reCAPTCHA is not configured.
 */
export async function validateRecaptcha(token: string | undefined): Promise<boolean> {
  if (!RECAPTCHA_SECRET) return true; // not configured → skip
  if (!token)            return false;

  try {
    const body = new URLSearchParams({
      secret:   RECAPTCHA_SECRET,
      response: token,
    });
    const res  = await fetch(RECAPTCHA_VERIFY, { method: "POST", body });
    const data = await res.json() as { success: boolean; score: number; "error-codes"?: string[] };

    if (!data.success) {
      console.warn("[recaptcha] Validation failed:", data["error-codes"]);
      return false;
    }
    if (data.score < RECAPTCHA_MIN_SCORE) {
      console.warn("[recaptcha] Score too low:", data.score);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[recaptcha] Error:", err);
    return true; // fail open — don't block legit users on reCAPTCHA outages
  }
}
