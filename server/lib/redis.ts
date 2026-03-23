/**
 * Redis client singleton
 *
 * Falls back to an in-memory stub when REDIS_URL is not set so the app
 * still works in local development without a Redis instance.
 */

import Redis from "ioredis";

// ── In-memory fallback ────────────────────────────────────────────────────────
// Mimics the subset of ioredis commands used by the security layer.
class InMemoryRedis {
  private store = new Map<string, { value: string; expiresAt: number }>();

  private expired(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return true;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return true;
    }
    return false;
  }

  async get(key: string): Promise<string | null> {
    if (this.expired(key)) return null;
    return this.store.get(key)?.value ?? null;
  }

  async set(key: string, value: string | number, ...args: any[]): Promise<"OK"> {
    let expiresAt = 0;
    const str = String(value);
    // parse EX / PX options
    for (let i = 0; i < args.length - 1; i++) {
      if (String(args[i]).toUpperCase() === "EX")  expiresAt = Date.now() + Number(args[i + 1]) * 1000;
      if (String(args[i]).toUpperCase() === "PX")  expiresAt = Date.now() + Number(args[i + 1]);
    }
    this.store.set(key, { value: str, expiresAt });
    return "OK";
  }

  async incr(key: string): Promise<number> {
    if (this.expired(key)) {
      this.store.set(key, { value: "1", expiresAt: 0 });
      return 1;
    }
    const current = parseInt(this.store.get(key)!.value, 10);
    const next = current + 1;
    this.store.get(key)!.value = String(next);
    return next;
  }

  async expire(key: string, seconds: number): Promise<number> {
    const entry = this.store.get(key);
    if (!entry) return 0;
    entry.expiresAt = Date.now() + seconds * 1000;
    return 1;
  }

  async ttl(key: string): Promise<number> {
    if (this.expired(key)) return -2;
    const entry = this.store.get(key);
    if (!entry || entry.expiresAt === 0) return -1;
    return Math.max(0, Math.ceil((entry.expiresAt - Date.now()) / 1000));
  }

  async del(...keys: string[]): Promise<number> {
    let count = 0;
    for (const key of keys) {
      if (this.store.has(key)) { this.store.delete(key); count++; }
    }
    return count;
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    const entry = this.store.get(key);
    const set: Set<string> = entry ? new Set(JSON.parse(entry.value)) : new Set();
    let added = 0;
    for (const m of members) { if (!set.has(m)) { set.add(m); added++; } }
    this.store.set(key, { value: JSON.stringify([...set]), expiresAt: entry?.expiresAt ?? 0 });
    return added;
  }

  async scard(key: string): Promise<number> {
    if (this.expired(key)) return 0;
    const entry = this.store.get(key);
    if (!entry) return 0;
    return JSON.parse(entry.value).length;
  }
}

// ── Client factory ────────────────────────────────────────────────────────────
// Siempre arranca con in-memory. Si REDIS_URL está definido, intenta conectar
// una sola vez; si lo logra, hace swap. Si falla en producción, hace exit(1).
let _client: Redis | InMemoryRedis = new InMemoryRedis();

const url = process.env.REDIS_URL;
const isProduction = process.env.NODE_ENV === "production";

if (!url && isProduction) {
  console.error("[redis] REDIS_URL is required in production. Set the REDIS_URL environment variable.");
  process.exit(1);
}

if (url) {
  const candidate = new Redis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    lazyConnect: true,
    retryStrategy: () => null, // sin reintentos automáticos
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

function getClient(): Redis | InMemoryRedis {
  return _client;
}

export const redis = {
  get:    (key: string)                           => getClient().get(key),
  set:    (key: string, value: string | number, ...args: any[]) => (getClient() as any).set(key, value, ...args),
  incr:   (key: string)                           => getClient().incr(key),
  expire: (key: string, seconds: number)          => getClient().expire(key, seconds),
  ttl:    (key: string)                           => getClient().ttl(key),
  del:    (...keys: string[])                     => getClient().del(...keys),
  sadd:   (key: string, ...members: string[])     => getClient().sadd(key, ...members),
  scard:  (key: string)                           => getClient().scard(key),
};
