import { Pool, type PoolConfig } from "pg";

const DEFAULT_POOL_MAX = 10;

let pool: Pool | undefined;

export function getDatabaseUrl() {
  const value = process.env.DATABASE_URL?.trim();
  return value || undefined;
}

export function requireDatabaseUrl() {
  const url = getDatabaseUrl();
  if (!url) {
    throw new Error(
      "DATABASE_URL is required for PostgreSQL operations. Copy .env.example to .env.local and configure a database.",
    );
  }
  return url;
}

/**
 * Lazily creates one process-level pool. Importing database helpers therefore
 * never opens a network connection during tests or the in-memory dev runtime.
 */
export function getDatabasePool(config: Omit<PoolConfig, "connectionString"> = {}) {
  if (!pool) {
    pool = new Pool({
      ...config,
      connectionString: requireDatabaseUrl(),
      max: config.max ?? DEFAULT_POOL_MAX,
    });
  }
  return pool;
}

export async function closeDatabasePool() {
  if (!pool) return;
  const currentPool = pool;
  pool = undefined;
  await currentPool.end();
}
