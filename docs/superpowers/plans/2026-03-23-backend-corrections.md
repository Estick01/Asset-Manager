# Backend Corrections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply 8 backend corrections to improve security, reliability and maintainability.

**Architecture:** Express + TypeScript + MySQL/Drizzle. All changes are surgical — no architectural refactors, just targeted fixes per file.

**Tech Stack:** Node.js, Express 5, TypeScript, Zod, ioredis, mysql2/drizzle-orm

**Skipped (already done or too risky):**
- Refresh token rotation → already implemented in `/api/auth/refresh` (sessions.rotate)
- Typo `storeage` folder rename → would cascade across 50+ imports, defer

---

## Task 1: Env vars validation at startup (Zod)

**Files:**
- Create: `server/lib/env.ts`
- Modify: `server/index.ts` (import env validation before anything else)

- [ ] **Step 1: Create `server/lib/env.ts`**

```ts
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.string().default("5000"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().optional(),
  BCRYPT_SALT_ROUNDS: z.string().default("12"),
  AWS_S3_BUCKET: z.string().optional(),
  AWS_REGION: z.string().optional(),
  RECAPTCHA_SECRET_KEY: z.string().optional(),
  NODEMAILER_HOST: z.string().optional(),
  NODEMAILER_USER: z.string().optional(),
  NODEMAILER_PASS: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  parsed.error.issues.forEach((issue) => {
    console.error(`  ${issue.path.join(".")}: ${issue.message}`);
  });
  process.exit(1);
}

export const env = parsed.data;
```

- [ ] **Step 2: Add import to top of `server/index.ts`** (before any other import)

Add as the very first import:
```ts
import "./lib/env.js"; // validate env vars at startup
```

- [ ] **Step 3: Verify server still starts**

Run: `npx tsx server/index.ts` (or check existing start command)
Expected: Server starts normally, no validation errors

- [ ] **Step 4: Commit**

```bash
git add server/lib/env.ts server/index.ts
git commit -m "feat: validate env vars at startup with Zod"
```

---

## Task 2: Reduce JSON body parser limit

**Files:**
- Modify: `server/index.ts` lines 99-108 (`setupBodyParsing`)

- [ ] **Step 1: Update body parser limit**

In `setupBodyParsing`, change:
```ts
// BEFORE
express.json({
  limit: "50mb",
  ...
})
// and
express.urlencoded({ extended: false, limit: "50mb" })
```

To:
```ts
// AFTER
express.json({
  limit: "1mb",   // JSON payloads should never be 50MB; files go via multer/S3
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  },
})
// and
express.urlencoded({ extended: false, limit: "1mb" })
```

Keep multer limit at 50MB (it's for actual file uploads, which is correct).

- [ ] **Step 2: Verify no existing routes break**

Check that no route sends large JSON payloads (they should all use multer for files).

- [ ] **Step 3: Commit**

```bash
git add server/index.ts
git commit -m "fix: reduce JSON body limit to 1mb, files use multer/S3"
```

---

## Task 3: Redis required in production

**Files:**
- Modify: `server/lib/redis.ts`

- [ ] **Step 1: Add production guard**

In `server/lib/redis.ts`, replace the connection block:

```ts
// BEFORE
const url = process.env.REDIS_URL;
if (url) {
  const candidate = new Redis(url, { ... });
  candidate.connect()
    .then(() => { _client = candidate; ... })
    .catch(() => {
      console.warn("[redis] No disponible — usando in-memory fallback ...");
      candidate.disconnect();
    });
}
```

```ts
// AFTER
const url = process.env.REDIS_URL;
const isProduction = process.env.NODE_ENV === "production";

if (!url && isProduction) {
  console.error("[redis] REDIS_URL is required in production. Set REDIS_URL env var.");
  process.exit(1);
}

if (url) {
  const candidate = new Redis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    lazyConnect: true,
    retryStrategy: () => null,
  });

  candidate.on("error", () => { /* silencioso */ });

  candidate.connect()
    .then(() => {
      _client = candidate;
      console.log("[redis] Connected");
    })
    .catch(() => {
      if (isProduction) {
        console.error("[redis] Failed to connect in production. Exiting.");
        process.exit(1);
      }
      console.warn("[redis] No disponible — usando in-memory fallback (single instance only)");
      candidate.disconnect();
    });
}
```

- [ ] **Step 2: Verify dev still works without REDIS_URL**

Ensure `NODE_ENV=development` with no `REDIS_URL` still starts (uses in-memory).

- [ ] **Step 3: Commit**

```bash
git add server/lib/redis.ts
git commit -m "fix: require Redis in production, fallback only in development"
```

---

## Task 4: Health check endpoint

**Files:**
- Create: `server/routes/health.ts`
- Modify: `server/routes/index.ts` (register health route)

- [ ] **Step 1: Create `server/routes/health.ts`**

```ts
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
```

- [ ] **Step 2: Register health route in `server/routes/index.ts`**

Find where routes are registered and add:
```ts
import healthRouter from "./health.js";
// ...
app.use("/", healthRouter); // no /api prefix — accessible to load balancers
```

- [ ] **Step 3: Test endpoint**

```bash
curl http://localhost:5000/health
```
Expected: `{ "status": "ok", "checks": { "db": "ok", "redis": "ok" }, ... }`

- [ ] **Step 4: Commit**

```bash
git add server/routes/health.ts server/routes/index.ts
git commit -m "feat: add /health endpoint for load balancer and monitoring"
```

---

## Task 5: Circuit breakers for external services (timeout wrappers)

**Files:**
- Create: `server/lib/timeout.ts`
- Modify: `server/services/email.service.ts` (wrap send calls)

- [ ] **Step 1: Create `server/lib/timeout.ts`**

```ts
/**
 * Wraps a promise with a timeout. Throws if the promise doesn't resolve within ms.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string
): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`[timeout] ${label} exceeded ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeout]);
}
```

- [ ] **Step 2: Read `server/services/email.service.ts`**

Check how email sends are called.

- [ ] **Step 3: Wrap email send with timeout**

In `server/services/email.service.ts`, wrap the transporter.sendMail call:
```ts
import { withTimeout } from "../lib/timeout.js";

// Before:
// await transporter.sendMail(mailOptions);

// After:
await withTimeout(
  transporter.sendMail(mailOptions),
  10_000, // 10s timeout for email
  "email.sendMail"
);
```

- [ ] **Step 4: Commit**

```bash
git add server/lib/timeout.ts server/services/email.service.ts
git commit -m "feat: add timeout wrapper for external service calls"
```

---

## Task 6: Move seed logic out of startup (idempotency guard)

**Files:**
- Modify: `server/index.ts` (seedDatabase function)

The goal is to add a clear warning in production and make the seed truly idempotent via a single DB check.

- [ ] **Step 1: Update seedDatabase in `server/index.ts`**

Replace the current `seedDatabase` function with:

```ts
async function seedDatabase() {
  if (process.env.NODE_ENV === "production") {
    console.warn(
      "[seed] WARNING: Running database seed on startup in production. " +
      "Consider moving this to a dedicated migration/seed script."
    );
  }

  // All checks are idempotent (check before insert)
  const defaultPlanId = "default-plan-id";
  const defaultPlan = await storage.getPlan(defaultPlanId);
  if (!defaultPlan) {
    log("Seeding default plan...");
    await storage.createPlan({
      id: defaultPlanId,
      nombre: "Básico",
      precio: "0.00",
      caracteristicas: "Plan básico gratuito",
    });
  }

  const estados = await storage.getEstadosProceso();
  if (estados.length === 0) {
    log("Seeding default estados...");
    await storage.createEstado({ nombre: "Activo", codigo: "activo", color: "#22c55e" });
    await storage.createEstado({ nombre: "En Tramite", codigo: "en_tramite", color: "#f59e0b" });
    await storage.createEstado({ nombre: "Finalizado", codigo: "finalizado", color: "#3b82f6" });
    await storage.createEstado({ nombre: "Archivado", codigo: "archivado", color: "#9ca3af" });
  }

  await seedLegalStages(db);
}
```

- [ ] **Step 2: Commit**

```bash
git add server/index.ts
git commit -m "fix: add production warning and idempotency to startup seed"
```

---

## Verification

After all tasks:

- [ ] Server starts cleanly: `npx tsx server/index.ts`
- [ ] `GET /health` returns `{ status: "ok" }`
- [ ] Missing `JWT_SECRET` causes clean exit with error message
- [ ] Large JSON body (>1MB) returns 413
- [ ] No TypeScript errors: `npx tsc --noEmit`
