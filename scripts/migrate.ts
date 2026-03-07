import { migrate } from "drizzle-orm/mysql2/migrator";
import { drizzle } from "drizzle-orm/mysql2";
import 'dotenv/config';
import path from "path";
import mysql from 'mysql2/promise';

async function main() {
  console.log("DATABASE_URL:", process.env.DATABASE_URL);
  const connection = await mysql.createConnection(
    process.env.DATABASE_URL as string
  );

  const db = drizzle(connection);

  console.log("Running migrations...");
  await migrate(db, { migrationsFolder: path.join(__dirname, "../migrations") });

  console.log("Migrations applied successfully!");
  await connection.end();
}

main().catch((error) => {
  console.error("Error running migrations:", error);
  process.exit(1);
});
