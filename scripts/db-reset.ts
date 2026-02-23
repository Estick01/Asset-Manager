import mysql2 from "mysql2/promise";

async function main() {
  console.log("Connecting to database...");
  const connection = await mysql2.createConnection({
    uri: "mysql://root:Pelusa1589@localhost:3306/Nueva",
  });

  try {
    console.log("Disabling foreign key checks...");
    await connection.execute("SET FOREIGN_KEY_CHECKS = 0;");

    console.log("Fetching all tables...");
    const [rows] = await connection.execute("SHOW TABLES;");
    const tables = (rows as any[]).map(row => Object.values(row)[0] as string);

    if (tables.length === 0) {
      console.log("No tables to drop.");
    } else {
      console.log("Dropping all tables...");
      for (const tableName of tables) {
        console.log(`Dropping table: ${tableName}`);
        await connection.execute(`DROP TABLE IF EXISTS \`${tableName}\`;`);
      }
      console.log("All tables dropped.");
    }
  } finally {
    console.log("Enabling foreign key checks...");
    await connection.execute("SET FOREIGN_KEY_CHECKS = 1;");
    await connection.end();
  }
  console.log("Database reset successfully!");
}

main().catch((error) => {
  console.error("Error resetting database:", error);
  process.exit(1);
});