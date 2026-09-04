import "./loadEnv";

import {
  SYNTHETIC_FACTOR_OBSERVATIONS,
  SYNTHETIC_DATA_SOURCES,
  SYNTHETIC_PRICE_OBSERVATIONS,
  SYNTHETIC_SEED,
  SYNTHETIC_WEATHER_OBSERVATIONS,
  SYNTHETIC_YIELD_OBSERVATIONS,
} from "../lib/data/syntheticSeed";
import { closeDatabasePool, getDatabasePool } from "../db/client";
import { seedSyntheticDatabase } from "../db/seedSynthetic";

const asJson = process.argv.includes("--json");
const writeToDatabase = process.argv.includes("--db");

async function main() {
  if (writeToDatabase) {
    const result = await seedSyntheticDatabase(getDatabasePool());
    console.log("Synthetic seed written to PostgreSQL.");
    Object.entries(result).forEach(([key, value]) => console.log(`${key}: ${value}`));
    return;
  }

  if (asJson) {
    process.stdout.write(`${JSON.stringify(SYNTHETIC_SEED)}\n`);
    return;
  }

  console.log("Synthetic seed payload prepared (development only).");
  console.log(`sources: ${SYNTHETIC_DATA_SOURCES.length}`);
  console.log(`areas: ${SYNTHETIC_SEED.areas.length}`);
  console.log(`crops: ${SYNTHETIC_SEED.crops.length}`);
  console.log(`varieties: ${SYNTHETIC_SEED.varieties.length}`);
  console.log(`factor observations: ${SYNTHETIC_FACTOR_OBSERVATIONS.length}`);
  console.log(`weather observations: ${SYNTHETIC_WEATHER_OBSERVATIONS.length}`);
  console.log(`price observations: ${SYNTHETIC_PRICE_OBSERVATIONS.length}`);
  console.log(`yield observations: ${SYNTHETIC_YIELD_OBSERVATIONS.length}`);
  console.log("No database write attempted. Use db:migrate then db:seed:synthetic with DATABASE_URL for PostgreSQL.");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => (writeToDatabase ? closeDatabasePool() : Promise.resolve()));
