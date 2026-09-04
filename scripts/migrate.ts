import "./loadEnv";

import { closeDatabasePool, getDatabasePool } from "../db/client";
import { runMigrations } from "../db/migrationRunner";

async function main() {
  const result = await runMigrations(getDatabasePool());
  if (result.applied.length === 0) {
    console.log(`Database is up to date (${result.total} migrations).`);
  } else {
    console.log(`Applied migrations: ${result.applied.join(", ")}`);
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => closeDatabasePool());
