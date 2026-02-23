import { migrate } from "drizzle-orm/mysql2/migrator";
import { drizzle } from "drizzle-orm/mysql2";
import mysql2 from "mysql2/promise";
import path from "path";

async function main() {
  console.log("Connecting to database...");
  const dbConnection = await mysql2.createConnection({
    uri: "mysql://root:Pelusa1589@localhost:3306/Nueva",
  });

  const db = drizzle(dbConnection);

  console.log("Running migrations...");
  await migrate(db, { migrationsFolder: path.join(__dirname, "../migrations") });

  console.log("Migrations applied successfully!");
  await dbConnection.end();
}

main().catch((error) => {
  console.error("Error running migrations:", error);
  process.exit(1);
});
