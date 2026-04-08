import { migrate } from "drizzle-orm/mysql2/migrator";
import { drizzle } from "drizzle-orm/mysql2";
import "dotenv/config";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import mysql from "mysql2/promise";

type JournalEntry = {
  idx: number;
  when: number;
  tag: string;
};

const BASELINE_CHECKS: Record<string, string[]> = {
  "0024_create_firm_invitations": [
    "SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'firm_invitations' LIMIT 1",
  ],
  "0069_create_admin_profiles": [
    "SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'admin_profiles' LIMIT 1",
  ],
  "0070_add_disabled_to_posts": [
    "SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'posts' AND column_name = 'disabled' LIMIT 1",
  ],
  "0071_add_admin_support_conversation_type": [
    "SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'conversations' AND column_name = 'type' AND column_type LIKE '%admin_support%' LIMIT 1",
  ],
  "0072_email_and_lawyer_verification": [
    "SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'email_verified' LIMIT 1",
    "SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'lawyer_profiles' AND column_name = 'professional_verification_status' LIMIT 1",
    "SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'email_verification_otps' LIMIT 1",
  ],
};

function getMigrationHash(migrationsFolder: string, tag: string): string {
  const filePath = path.join(migrationsFolder, `${tag}.sql`);
  const content = fs.readFileSync(filePath, "utf8");
  return crypto.createHash("sha256").update(content).digest("hex");
}

async function ensureMigrationTable(connection: mysql.Connection) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `);
}

async function hasBaselineObjects(connection: mysql.Connection, tag: string): Promise<boolean> {
  const checks = BASELINE_CHECKS[tag];
  if (!checks) return false;

  for (const query of checks) {
    const [rows] = await connection.query(query);
    if (!Array.isArray(rows) || rows.length === 0) return false;
  }

  return true;
}

async function syncExistingMigrations(connection: mysql.Connection, migrationsFolder: string) {
  const journalPath = path.join(migrationsFolder, "meta", "_journal.json");
  const journal = JSON.parse(fs.readFileSync(journalPath, "utf8")) as { entries: JournalEntry[] };

  await ensureMigrationTable(connection);

  const [existingRows] = await connection.query("SELECT id, hash FROM __drizzle_migrations ORDER BY id");
  const existing = Array.isArray(existingRows) ? existingRows as Array<{ id: number; hash: string }> : [];
  const existingHashes = new Set(existing.map((row) => row.hash));
  let nextId = existing.length > 0 ? Math.max(...existing.map((row) => row.id)) + 1 : 1;

  for (let index = 0; index < journal.entries.length; index += 1) {
    const entry = journal.entries[index];
    const hash = getMigrationHash(migrationsFolder, entry.tag);

    if (existingHashes.has(hash)) continue;

    const isMissingHistoricalMarker = index >= existing.length;
    if (!isMissingHistoricalMarker) continue;

    const canBaseline = await hasBaselineObjects(connection, entry.tag);
    if (!canBaseline) continue;

    await connection.query(
      "INSERT INTO __drizzle_migrations (id, hash, created_at) VALUES (?, ?, ?)",
      [nextId, hash, entry.when],
    );

    console.log(`Baselined migration marker for ${entry.tag}`);
    existingHashes.add(hash);
    nextId += 1;
  }
}

async function main() {
  console.log("DATABASE_URL:", process.env.DATABASE_URL);
  const connection = await mysql.createConnection(
    process.env.DATABASE_URL as string,
  );

  const migrationsFolder = path.join(__dirname, "../migrations");
  await syncExistingMigrations(connection, migrationsFolder);

  const db = drizzle(connection);

  console.log("Running migrations...");
  await migrate(db, { migrationsFolder });

  console.log("Migrations applied successfully!");
  await connection.end();
}

main().catch((error) => {
  console.error("Error running migrations:", error);
  process.exit(1);
});
