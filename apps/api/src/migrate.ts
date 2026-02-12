import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error(
    "DATABASE_URL is not set. Please define it in your .env file before running migrations."
  );
  process.exit(1);
}

async function runMigrations() {
  const pool = new Pool({ connectionString: databaseUrl });
  const client = await pool.connect();

  try {
    await client.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`
    );

    const migrationsDir = path.join(__dirname, "migrations");

    if (!fs.existsSync(migrationsDir)) {
      console.log(`No migrations directory found at ${migrationsDir}. Nothing to run.`);
      return;
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    if (files.length === 0) {
      console.log("No migration files found. Nothing to run.");
      return;
    }

    const appliedResult = await client.query<{ name: string }>(
      "SELECT name FROM schema_migrations"
    );
    const appliedNames = new Set(appliedResult.rows.map((row) => row.name));

    for (const file of files) {
      if (appliedNames.has(file)) {
        console.log(`Skipping already applied migration: ${file}`);
        continue;
      }

      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, "utf8");

      if (!sql.trim()) {
        console.log(`Skipping empty migration file: ${file}`);
        continue;
      }

      console.log(`Applying migration: ${file}`);

      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query(
          "INSERT INTO schema_migrations (name) VALUES ($1)",
          [file]
        );
        await client.query("COMMIT");
        console.log(`Migration applied successfully: ${file}`);
      } catch (err) {
        await client.query("ROLLBACK");
        console.error(`Failed to apply migration: ${file}`);
        console.error(err);
        throw err;
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations()
  .then(() => {
    console.log("All migrations completed.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Migration process failed.", err);
    process.exit(1);
  });

