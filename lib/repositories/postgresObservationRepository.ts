import type { Pool, PoolClient, QueryResultRow } from "pg";

import type {
  FactorObservation,
  PriceObservation,
  ScalarValue,
  WeatherObservation,
  YieldObservation,
} from "@/lib/domain/types";
import type { ObservationRepository } from "@/lib/repositories/observationRepository";

type Queryable = Pick<Pool, "query"> | Pick<PoolClient, "query">;

type FactorRow = QueryResultRow & {
  id: string;
  area_key: string;
  cultivation_id: string | null;
  factor_key: string;
  observed_at: Date | string;
  value: unknown;
  unit: string | null;
  source_key: string;
  data_origin: FactorObservation["dataOrigin"];
  quality_flags: unknown;
};

type PriceRow = QueryResultRow & {
  id: string;
  crop_key: string;
  observed_date: Date | string;
  price: number | string;
  currency: "THB";
  unit: "kg";
  price_type: PriceObservation["priceType"];
  market: string | null;
  source_key: string;
  data_origin: PriceObservation["dataOrigin"];
};

type WeatherRow = QueryResultRow & {
  id: string;
  area_key: string;
  observed_date: Date | string;
  temperature_min_c: number | string;
  temperature_max_c: number | string;
  temperature_avg_c: number | string;
  rainfall_mm: number | string;
  relative_humidity_pct: number | string;
  solar_radiation: number | string;
  wind_speed_mps: number | string;
  source_key: string;
  data_origin: WeatherObservation["dataOrigin"];
};

type YieldRow = QueryResultRow & {
  id: string;
  area_key: string;
  crop_key: string;
  harvest_date: Date | string;
  yield_kg_per_rai: number | string;
  source_key: string;
  data_origin: YieldObservation["dataOrigin"];
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const FACTOR_COLUMNS = `
  fo.id, a.area_key, fo.cultivation_cycle_id AS cultivation_id, f.factor_key,
  fo.observed_at, fo.value, fo.unit, ds.source_key, fo.data_origin, fo.quality_flags
`;
const PRICE_COLUMNS = `
  po.id, c.crop_key, po.observed_date, po.price, po.currency, po.unit,
  po.price_type, po.market, ds.source_key, po.data_origin
`;
const WEATHER_COLUMNS = `
  wo.id, a.area_key, wo.observed_date, wo.temperature_min_c, wo.temperature_max_c,
  wo.temperature_avg_c, wo.rainfall_mm, wo.relative_humidity_pct, wo.solar_radiation,
  wo.wind_speed_mps, ds.source_key, wo.data_origin
`;
const YIELD_COLUMNS = `
  yo.id, a.area_key, c.crop_key, yo.harvest_date, yo.yield_kg_per_rai,
  ds.source_key, yo.data_origin
`;

function isoDate(value: Date | string) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}

function isoTimestamp(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function scalar(value: unknown): ScalarValue {
  if (typeof value === "number" || typeof value === "string" || typeof value === "boolean") return value;
  throw new Error("Database factor observation value is not scalar");
}

function qualityFlags(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  const flags = value.filter((item): item is string => typeof item === "string");
  return flags.length > 0 ? flags : undefined;
}

function toFactor(row: FactorRow): FactorObservation {
  return {
    id: row.id,
    areaKey: row.area_key,
    ...(row.cultivation_id ? { cultivationId: row.cultivation_id } : {}),
    factorKey: row.factor_key,
    observedAt: isoTimestamp(row.observed_at),
    value: scalar(row.value),
    ...(row.unit === null ? {} : { unit: row.unit }),
    sourceId: row.source_key,
    dataOrigin: row.data_origin,
    ...(qualityFlags(row.quality_flags) ? { qualityFlags: qualityFlags(row.quality_flags) } : {}),
  };
}

function toPrice(row: PriceRow): PriceObservation {
  return {
    id: row.id,
    cropKey: row.crop_key,
    date: isoDate(row.observed_date),
    price: Number(row.price),
    currency: row.currency,
    unit: row.unit,
    priceType: row.price_type,
    ...(row.market === null ? {} : { market: row.market }),
    sourceId: row.source_key,
    dataOrigin: row.data_origin,
  };
}

function toWeather(row: WeatherRow): WeatherObservation {
  return {
    id: row.id,
    areaKey: row.area_key,
    date: isoDate(row.observed_date),
    temperatureMinC: Number(row.temperature_min_c),
    temperatureMaxC: Number(row.temperature_max_c),
    temperatureAvgC: Number(row.temperature_avg_c),
    rainfallMm: Number(row.rainfall_mm),
    relativeHumidityPct: Number(row.relative_humidity_pct),
    solarRadiation: Number(row.solar_radiation),
    windSpeedMps: Number(row.wind_speed_mps),
    sourceId: row.source_key,
    dataOrigin: row.data_origin,
  };
}

function toYield(row: YieldRow): YieldObservation {
  return {
    id: row.id,
    areaKey: row.area_key,
    cropKey: row.crop_key,
    harvestDate: isoDate(row.harvest_date),
    yieldKgPerRai: Number(row.yield_kg_per_rai),
    sourceId: row.source_key,
    dataOrigin: row.data_origin,
  };
}

function insertedRows(result: { rowCount: number | null }) {
  return result.rowCount ?? 0;
}

export class PostgresObservationRepository implements ObservationRepository {
  constructor(private readonly database: Pool) {}

  async saveFactors(records: readonly FactorObservation[]) {
    let inserted = 0;
    for (const record of records) {
      const result = await this.database.query(
        `INSERT INTO factor_observations
          (area_id, cultivation_cycle_id, factor_id, observed_at, value, unit, source_id, data_origin, quality_flags)
         SELECT a.id,
                CASE WHEN $2::text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
                     THEN $2::uuid ELSE NULL END,
                f.id, $4, $5::jsonb, $6, ds.id, $7, $8::jsonb
         FROM areas a
         JOIN factor_definitions f ON f.factor_key = $3 AND f.active = true
         JOIN data_sources ds ON ds.source_key = $7
         WHERE a.area_key = $1 AND a.active = true
         ON CONFLICT DO NOTHING`,
        [
          record.areaKey,
          record.cultivationId && UUID_PATTERN.test(record.cultivationId) ? record.cultivationId : "",
          record.factorKey,
          record.observedAt,
          JSON.stringify(record.value),
          record.unit ?? null,
          record.sourceId,
          JSON.stringify(record.qualityFlags ?? []),
        ],
      );
      inserted += insertedRows(result);
    }
    return inserted;
  }

  async savePrices(records: readonly PriceObservation[]) {
    let inserted = 0;
    for (const record of records) {
      const result = await this.database.query(
        `INSERT INTO price_observations
          (crop_id, observed_date, price, currency, unit, price_type, market, source_id, data_origin)
         SELECT c.id, $2, $3, $4, $5, $6, $7, ds.id, $8
         FROM crops c
         JOIN data_sources ds ON ds.source_key = $9
         WHERE c.crop_key = $1 AND c.active = true
         ON CONFLICT DO NOTHING`,
        [
          record.cropKey,
          record.date,
          record.price,
          record.currency,
          record.unit,
          record.priceType,
          record.market ?? null,
          record.dataOrigin,
          record.sourceId,
        ],
      );
      inserted += insertedRows(result);
    }
    return inserted;
  }

  async saveWeather(records: readonly WeatherObservation[]) {
    let inserted = 0;
    for (const record of records) {
      const result = await this.database.query(
        `INSERT INTO weather_observations
          (area_id, observed_date, temperature_min_c, temperature_max_c, temperature_avg_c,
           rainfall_mm, relative_humidity_pct, solar_radiation, wind_speed_mps, source_id, data_origin)
         SELECT a.id, $2, $3, $4, $5, $6, $7, $8, $9, ds.id, $10
         FROM areas a
         JOIN data_sources ds ON ds.source_key = $11
         WHERE a.area_key = $1 AND a.active = true
         ON CONFLICT DO NOTHING`,
        [
          record.areaKey,
          record.date,
          record.temperatureMinC,
          record.temperatureMaxC,
          record.temperatureAvgC,
          record.rainfallMm,
          record.relativeHumidityPct,
          record.solarRadiation,
          record.windSpeedMps,
          record.dataOrigin,
          record.sourceId,
        ],
      );
      inserted += insertedRows(result);
    }
    return inserted;
  }

  async saveYields(records: readonly YieldObservation[]) {
    let inserted = 0;
    for (const record of records) {
      const result = await this.database.query(
        `INSERT INTO yield_observations
          (area_id, crop_id, harvest_date, yield_kg_per_rai, source_id, data_origin)
         SELECT a.id, c.id, $3, $4, ds.id, $5
         FROM areas a
         JOIN crops c ON c.crop_key = $2 AND c.active = true
         JOIN data_sources ds ON ds.source_key = $6
         WHERE a.area_key = $1 AND a.active = true
         ON CONFLICT DO NOTHING`,
        [
          record.areaKey,
          record.cropKey,
          record.harvestDate,
          record.yieldKgPerRai,
          record.dataOrigin,
          record.sourceId,
        ],
      );
      inserted += insertedRows(result);
    }
    return inserted;
  }

  async listFactors() {
    const result = await this.database.query<FactorRow>(
      `SELECT ${FACTOR_COLUMNS}
       FROM factor_observations fo
       JOIN areas a ON a.id = fo.area_id
       JOIN factor_definitions f ON f.id = fo.factor_id
       JOIN data_sources ds ON ds.id = fo.source_id
       ORDER BY fo.observed_at DESC, fo.id`,
    );
    return result.rows.map(toFactor);
  }

  async listPrices() {
    const result = await this.database.query<PriceRow>(
      `SELECT ${PRICE_COLUMNS}
       FROM price_observations po
       JOIN crops c ON c.id = po.crop_id
       JOIN data_sources ds ON ds.id = po.source_id
       ORDER BY po.observed_date DESC, po.id`,
    );
    return result.rows.map(toPrice);
  }

  async listWeather() {
    const result = await this.database.query<WeatherRow>(
      `SELECT ${WEATHER_COLUMNS}
       FROM weather_observations wo
       JOIN areas a ON a.id = wo.area_id
       JOIN data_sources ds ON ds.id = wo.source_id
       ORDER BY wo.observed_date DESC, wo.id`,
    );
    return result.rows.map(toWeather);
  }

  async listYields() {
    const result = await this.database.query<YieldRow>(
      `SELECT ${YIELD_COLUMNS}
       FROM yield_observations yo
       JOIN areas a ON a.id = yo.area_id
       JOIN crops c ON c.id = yo.crop_id
       JOIN data_sources ds ON ds.id = yo.source_id
       ORDER BY yo.harvest_date DESC, yo.id`,
    );
    return result.rows.map(toYield);
  }
}
