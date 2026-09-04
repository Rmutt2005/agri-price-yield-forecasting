import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import type { Pool, PoolClient } from "pg";

export type MigrationFile = {
  version: string;
  fileName: string;
  sql: string;
};

const MIGRATION_FILE_PATTERN = /^(\d+)[-_].+\.sql$/i;

export function loadMigrations(
  migrationsDirectory = path.resolve(process.cwd(), "db", "migrations"),
): MigrationFile[] {
  return readdirSync(migrationsDirectory)
    .filter((fileName) => MIGRATION_FILE_PATTERN.test(fileName))
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }))
    .map((fileName) => ({
      version: fileName.match(MIGRATION_FILE_PATTERN)?.[1] ?? fileName,
      fileName,
      sql: readFileSync(path.join(migrationsDirectory, fileName), "utf8"),
    }));
}

async function ensureMigrationTable(client: PoolClient) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version text PRIMARY KEY,
      file_name text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

export async function runMigrations(
  database: Pick<Pool, "connect">,
  migrations = loadMigrations(),
) {
  const client = await database.connect();
  const applied: string[] = [];
  try {
    await ensureMigrationTable(client);
    const existing = await client.query<{ version: string }>(
      "SELECT version FROM schema_migrations ORDER BY version",
    );
    const appliedVersions = new Set(existing.rows.map((row) => row.version));

    for (const migration of migrations) {
      if (appliedVersions.has(migration.version)) continue;
      await client.query("BEGIN");
      try {
        await client.query(migration.sql);
        await client.query(
          "INSERT INTO schema_migrations (version, file_name) VALUES ($1, $2)",
          [migration.version, migration.fileName],
        );
        await client.query("COMMIT");
        applied.push(migration.fileName);
      } catch (error) {
        await client.query("ROLLBACK");
        throw new Error(`Migration ${migration.fileName} failed`, { cause: error });
      }
    }
    return { applied, total: migrations.length };
  } finally {
    client.release();
  }
}
