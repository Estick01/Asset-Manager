import { Router } from "express";
import { db } from "../db.js";
import { sql } from "drizzle-orm";
import { redis } from "../lib/redis.js";

const router = Router();

router.get("/health", async (_req, res) => {
  const checks: Record<string, "ok" | "error"> = {};

  // Database check
  try {
    await db.execute(sql`SELECT 1`);
    checks.db = "ok";
  } catch {
    checks.db = "error";
  }

  // Redis check
  try {
    await redis.set("health:ping", "1", "EX", 5);
    checks.redis = "ok";
  } catch {
    checks.redis = "error";
  }

  const allOk = Object.values(checks).every((v) => v === "ok");
  const status = allOk ? 200 : 503;

  res.status(status).json({
    status: allOk ? "ok" : "degraded",
    checks,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

export default router;
