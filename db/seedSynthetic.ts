import { DATA_SOURCES } from "@/lib/domain/dataSources";
import { AREAS, CROP_VARIETIES, CROPS } from "@/lib/domain/catalog";
import { BASELINE_FACTORS } from "@/lib/domain/factorRegistry";
import { INITIAL_MODELS } from "@/lib/repositories/modelRepository";
import { hashPassword } from "@/lib/repositories/authCore";
import {
  SYNTHETIC_DATA_SOURCES,
  SYNTHETIC_FACTOR_OBSERVATIONS,
  SYNTHETIC_PRICE_OBSERVATIONS,
  SYNTHETIC_WEATHER_OBSERVATIONS,
  SYNTHETIC_YIELD_OBSERVATIONS,
} from "@/lib/data/syntheticSeed";
import type { DataSource } from "@/lib/domain/types";
import type { Pool, PoolClient } from "pg";

type Queryable = Pick<Pool, "query"> | Pick<PoolClient, "query">;

type SeedCounts = {
  sources: number;
  areas: number;
  crops: number;
  varieties: number;
  factors: number;
  factorObservations: number;
  weather: number;
  prices: number;
  yields: number;
  models: number;
  devAdmins: number;
};

const sourceRows = [
  ...DATA_SOURCES,
  ...SYNTHETIC_DATA_SOURCES,
].reduce<DataSource[]>((rows, source) => {
  const index = rows.findIndex((row) => row.id === source.id);
  if (index >= 0) rows[index] = source;
  else rows.push(source);
  return rows;
}, []);

async function idFor(
  database: Queryable,
  table: "areas" | "crops" | "factor_definitions" | "data_sources",
  keyColumn: string,
  key: string,
) {
  const result = await database.query<{ id: string }>(
    `SELECT id FROM ${table} WHERE ${keyColumn} = $1`,
    [key],
  );
  const id = result.rows[0]?.id;
  if (!id) throw new Error(`Seed lookup failed: ${table}.${keyColumn}=${key}`);
  return id;
}

async function seedCatalog(database: Queryable) {
  for (const source of sourceRows) {
    await database.query(
      `INSERT INTO data_sources
        (source_key, name, source_type, priority, enabled, status, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
       ON CONFLICT (source_key) DO UPDATE SET
         name = EXCLUDED.name,
         source_type = EXCLUDED.source_type,
         priority = EXCLUDED.priority,
         enabled = EXCLUDED.enabled,
         status = EXCLUDED.status,
         metadata = EXCLUDED.metadata`,
      [source.id, source.name, source.type, source.priority, source.enabled, source.status, JSON.stringify(source.metadata)],
    );
  }
  for (const area of AREAS) {
    await database.query(
      `INSERT INTO areas
        (area_key, name, location, latitude, longitude, elevation_m, data_origin, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (area_key) DO UPDATE SET
         name = EXCLUDED.name,
         location = EXCLUDED.location,
         latitude = EXCLUDED.latitude,
         longitude = EXCLUDED.longitude,
         elevation_m = EXCLUDED.elevation_m,
         data_origin = EXCLUDED.data_origin,
         active = EXCLUDED.active`,
      [area.key, area.name, area.location, area.latitude, area.longitude, area.elevationM, area.dataOrigin, area.active],
    );
  }
  for (const crop of CROPS) {
    await database.query(
      `INSERT INTO crops
        (crop_key, name, default_growing_days, data_origin, active)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (crop_key) DO UPDATE SET
         name = EXCLUDED.name,
         default_growing_days = EXCLUDED.default_growing_days,
         data_origin = EXCLUDED.data_origin,
         active = EXCLUDED.active`,
      [crop.key, crop.name, crop.defaultGrowingDays, crop.dataOrigin, crop.active],
    );
  }
  for (const variety of CROP_VARIETIES) {
    const cropId = await idFor(database, "crops", "crop_key", variety.cropKey);
    await database.query(
      `INSERT INTO crop_varieties
        (crop_id, variety_key, name, growing_days_override, data_origin, active)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (variety_key) DO UPDATE SET
         crop_id = EXCLUDED.crop_id,
         name = EXCLUDED.name,
         growing_days_override = EXCLUDED.growing_days_override,
         data_origin = EXCLUDED.data_origin,
         active = EXCLUDED.active`,
      [cropId, variety.key, variety.name, variety.growingDaysOverride ?? null, variety.dataOrigin, variety.active],
    );
  }
  for (const factor of BASELINE_FACTORS) {
    await database.query(
      `INSERT INTO factor_definitions
        (factor_key, name, category, data_type, unit, description, aggregation_method, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (factor_key) DO UPDATE SET
         name = EXCLUDED.name,
         category = EXCLUDED.category,
         data_type = EXCLUDED.data_type,
         unit = EXCLUDED.unit,
         description = EXCLUDED.description,
         aggregation_method = EXCLUDED.aggregation_method,
         active = EXCLUDED.active`,
      [factor.key, factor.name, factor.category, factor.dataType, factor.unit ?? null, factor.description, factor.aggregationMethod, factor.active],
    );
  }
}

async function seedObservations(database: Queryable) {
  let factorObservations = 0;
  for (const observation of SYNTHETIC_FACTOR_OBSERVATIONS) {
    const areaId = await idFor(database, "areas", "area_key", observation.areaKey);
    const factorId = await idFor(database, "factor_definitions", "factor_key", observation.factorKey);
    const sourceId = await idFor(database, "data_sources", "source_key", observation.sourceId);
    const result = await database.query(
      `INSERT INTO factor_observations
        (area_id, factor_id, observed_at, value, unit, source_id, data_origin, quality_flags)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8::jsonb)
       ON CONFLICT DO NOTHING`,
      [areaId, factorId, observation.observedAt, JSON.stringify(observation.value), observation.unit ?? null, sourceId, observation.dataOrigin, JSON.stringify(observation.qualityFlags ?? [])],
    );
    factorObservations += result.rowCount ?? 0;
  }

  let weather = 0;
  for (const observation of SYNTHETIC_WEATHER_OBSERVATIONS) {
    const areaId = await idFor(database, "areas", "area_key", observation.areaKey);
    const sourceId = await idFor(database, "data_sources", "source_key", observation.sourceId);
    const result = await database.query(
      `INSERT INTO weather_observations
        (area_id, observed_date, temperature_min_c, temperature_max_c, temperature_avg_c,
         rainfall_mm, relative_humidity_pct, solar_radiation, wind_speed_mps, source_id, data_origin)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (area_id, observed_date, source_id) DO NOTHING`,
      [areaId, observation.date, observation.temperatureMinC, observation.temperatureMaxC, observation.temperatureAvgC, observation.rainfallMm, observation.relativeHumidityPct, observation.solarRadiation, observation.windSpeedMps, sourceId, observation.dataOrigin],
    );
    weather += result.rowCount ?? 0;
  }

  let prices = 0;
  for (const observation of SYNTHETIC_PRICE_OBSERVATIONS) {
    const cropId = await idFor(database, "crops", "crop_key", observation.cropKey);
    const sourceId = await idFor(database, "data_sources", "source_key", observation.sourceId);
    const result = await database.query(
      `INSERT INTO price_observations
        (crop_id, observed_date, price, currency, unit, price_type, market, source_id, data_origin)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (crop_id, observed_date, price_type, market, source_id) DO NOTHING`,
      [cropId, observation.date, observation.price, observation.currency, observation.unit, observation.priceType, observation.market ?? null, sourceId, observation.dataOrigin],
    );
    prices += result.rowCount ?? 0;
  }

  let yields = 0;
  for (const observation of SYNTHETIC_YIELD_OBSERVATIONS) {
    const areaId = await idFor(database, "areas", "area_key", observation.areaKey);
    const cropId = await idFor(database, "crops", "crop_key", observation.cropKey);
    const sourceId = await idFor(database, "data_sources", "source_key", observation.sourceId);
    const result = await database.query(
      `INSERT INTO yield_observations
        (area_id, crop_id, harvest_date, yield_kg_per_rai, source_id, data_origin)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT DO NOTHING`,
      [areaId, cropId, observation.harvestDate, observation.yieldKgPerRai, sourceId, observation.dataOrigin],
    );
    yields += result.rowCount ?? 0;
  }

  return { factorObservations, weather, prices, yields };
}

async function seedBaselineModels(database: Queryable) {
  for (const model of INITIAL_MODELS) {
    await database.query(
      `INSERT INTO model_versions
        (model_key, version, model_type, target, feature_schema, training_timestamp,
         metrics, status, artifact_location, parameters)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7::jsonb, $8, $9, $10::jsonb)
       ON CONFLICT (model_type, version) DO NOTHING`,
      [
        model.modelKey,
        model.version,
        model.modelType,
        model.target,
        JSON.stringify(model.featureSchema),
        model.trainingTimestamp,
        JSON.stringify(model.metrics),
        model.status,
        `synthetic://${model.version}`,
        JSON.stringify(model.parameters ?? {}),
      ],
    );
  }
}

async function seedDevelopmentAdmin(database: Queryable) {
  const email = process.env.DEV_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.DEV_ADMIN_PASSWORD;

  if (!email && !password) return 0;
  if (process.env.NODE_ENV === "production" || process.env.APP_ENV === "production") {
    throw new Error("DEV_ADMIN_EMAIL/DEV_ADMIN_PASSWORD are disabled in production.");
  }
  if (!email || !password) {
    throw new Error("DEV_ADMIN_EMAIL and DEV_ADMIN_PASSWORD must be configured together.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("DEV_ADMIN_EMAIL must be a valid email address.");
  }
  if (password.length < 8) {
    throw new Error("DEV_ADMIN_PASSWORD must be at least 8 characters.");
  }

  const result = await database.query(
    `INSERT INTO users (full_name, email, password_hash, role, active)
     VALUES ($1, $2, $3, 'ADMIN', true)
     ON CONFLICT (email) DO NOTHING`,
    ["Development Admin", email, hashPassword(password)],
  );
  return result.rowCount ?? 0;
}

export async function seedSyntheticDatabase(database: Pool) {
  const client = await database.connect();
  try {
    await client.query("BEGIN");
    await seedCatalog(client);
    const observations = await seedObservations(client);
    await seedBaselineModels(client);
    const devAdmins = await seedDevelopmentAdmin(client);
    await client.query("COMMIT");
    const counts: SeedCounts = {
      sources: sourceRows.length,
      areas: AREAS.length,
      crops: CROPS.length,
      varieties: CROP_VARIETIES.length,
      factors: BASELINE_FACTORS.length,
      ...observations,
      models: INITIAL_MODELS.length,
      devAdmins,
    };
    return counts;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
