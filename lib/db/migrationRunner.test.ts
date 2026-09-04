import { describe, expect, it } from "vitest";
import type { PoolClient } from "pg";

import { loadMigrations, runMigrations, type MigrationFile } from "@/db/migrationRunner";

describe("PostgreSQL migration boundary", () => {
  it("loads migrations in numeric order and includes durable session support", () => {
    const migrations = loadMigrations();
    expect(migrations.map((migration) => migration.fileName)).toEqual([
      "0001_initial.sql",
      "0002_auth_sessions_and_natural_keys.sql",
      "0003_durable_snapshots_and_price_key.sql",
    ]);
    expect(migrations[0]?.sql).toContain("CREATE TABLE IF NOT EXISTS areas");
    expect(migrations[1]?.sql).toContain("CREATE TABLE IF NOT EXISTS auth_sessions");
    expect(migrations[2]?.sql).toContain("response_snapshot");
  });

  it("applies only pending migrations in a transaction", async () => {
    const calls: string[] = [];
    const client = {
      query: async (sql: string) => {
        calls.push(sql.trim());
        if (sql.includes("SELECT version FROM schema_migrations")) {
          return { rows: [{ version: "1" }] };
        }
        return { rows: [], rowCount: 1 };
      },
      release: () => undefined,
    } as unknown as PoolClient;
    const migrations: MigrationFile[] = [
      { version: "1", fileName: "0001_first.sql", sql: "SELECT 1" },
      { version: "2", fileName: "0002_second.sql", sql: "SELECT 2" },
    ];

    const result = await runMigrations(
      { connect: async () => client },
      migrations,
    );

    expect(result).toEqual({ applied: ["0002_second.sql"], total: 2 });
    expect(calls).toEqual(expect.arrayContaining(["BEGIN", "SELECT 2", "COMMIT"]));
    expect(calls).not.toContain("SELECT 1");
  });
});
