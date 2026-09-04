import type { Pool, QueryResultRow } from "pg";

import type { Area, Crop, CropVariety, FactorDefinition } from "@/lib/domain/types";
import type { CatalogRepository } from "@/lib/repositories/catalogRepository";

type AreaRow = QueryResultRow & {
  id: string;
  area_key: string;
  name: string;
  location: string;
  latitude: number | string;
  longitude: number | string;
  elevation_m: number | string;
  data_origin: Area["dataOrigin"];
  active: boolean;
};

type CropRow = QueryResultRow & {
  id: string;
  crop_key: string;
  name: string;
  default_growing_days: number | string;
  data_origin: Crop["dataOrigin"];
  active: boolean;
};

type VarietyRow = QueryResultRow & {
  id: string;
  crop_key: string;
  variety_key: string;
  name: string;
  growing_days_override: number | string | null;
  data_origin: CropVariety["dataOrigin"];
  active: boolean;
};

type FactorRow = QueryResultRow & {
  id: string;
  factor_key: string;
  name: string;
  category: FactorDefinition["category"];
  data_type: FactorDefinition["dataType"];
  unit: string | null;
  description: string;
  aggregation_method: FactorDefinition["aggregationMethod"];
  active: boolean;
};

const AREA_COLUMNS = `
  id, area_key, name, location, latitude, longitude, elevation_m, data_origin, active
`;
const CROP_COLUMNS = `
  id, crop_key, name, default_growing_days, data_origin, active
`;
const VARIETY_COLUMNS = `
  cv.id, c.crop_key, cv.variety_key, cv.name, cv.growing_days_override,
  cv.data_origin, cv.active
`;
const FACTOR_COLUMNS = `
  id, factor_key, name, category, data_type, unit, description, aggregation_method, active
`;

function numberValue(value: number | string) {
  return typeof value === "number" ? value : Number(value);
}

function toArea(row: AreaRow): Area {
  return {
    id: row.id,
    key: row.area_key,
    name: row.name,
    location: row.location,
    latitude: numberValue(row.latitude),
    longitude: numberValue(row.longitude),
    elevationM: numberValue(row.elevation_m),
    dataOrigin: row.data_origin,
    active: row.active,
  };
}

function toCrop(row: CropRow): Crop {
  return {
    id: row.id,
    key: row.crop_key,
    name: row.name,
    defaultGrowingDays: numberValue(row.default_growing_days),
    dataOrigin: row.data_origin,
    active: row.active,
  };
}

function toVariety(row: VarietyRow): CropVariety {
  const growingDays = row.growing_days_override === null
    ? undefined
    : numberValue(row.growing_days_override);
  return {
    id: row.id,
    cropKey: row.crop_key,
    key: row.variety_key,
    name: row.name,
    ...(growingDays === undefined ? {} : { growingDaysOverride: growingDays }),
    dataOrigin: row.data_origin,
    active: row.active,
  };
}

function toFactor(row: FactorRow): FactorDefinition {
  return {
    id: row.id,
    key: row.factor_key,
    name: row.name,
    category: row.category,
    dataType: row.data_type,
    ...(row.unit === null ? {} : { unit: row.unit }),
    description: row.description,
    aggregationMethod: row.aggregation_method,
    active: row.active,
  };
}

export class PostgresCatalogRepository implements CatalogRepository {
  constructor(private readonly database: Pool) {}

  async listAreas() {
    const result = await this.database.query<AreaRow>(
      `SELECT ${AREA_COLUMNS} FROM areas WHERE active = true ORDER BY area_key`,
    );
    return result.rows.map(toArea);
  }

  async listCrops() {
    const result = await this.database.query<CropRow>(
      `SELECT ${CROP_COLUMNS} FROM crops WHERE active = true ORDER BY crop_key`,
    );
    return result.rows.map(toCrop);
  }

  async listVarieties(cropKey?: string) {
    const result = await this.database.query<VarietyRow>(
      `SELECT ${VARIETY_COLUMNS}
       FROM crop_varieties cv
       JOIN crops c ON c.id = cv.crop_id
       WHERE cv.active = true AND c.active = true
         AND ($1::text IS NULL OR c.crop_key = $1)
       ORDER BY c.crop_key, cv.variety_key`,
      [cropKey ?? null],
    );
    return result.rows.map(toVariety);
  }

  async listFactors() {
    const result = await this.database.query<FactorRow>(
      `SELECT ${FACTOR_COLUMNS} FROM factor_definitions WHERE active = true ORDER BY factor_key`,
    );
    return result.rows.map(toFactor);
  }

  async findArea(areaKey: string) {
    const result = await this.database.query<AreaRow>(
      `SELECT ${AREA_COLUMNS} FROM areas WHERE area_key = $1 AND active = true`,
      [areaKey],
    );
    return result.rows[0] ? toArea(result.rows[0]) : undefined;
  }

  async findCrop(cropKey: string) {
    const result = await this.database.query<CropRow>(
      `SELECT ${CROP_COLUMNS} FROM crops WHERE crop_key = $1 AND active = true`,
      [cropKey],
    );
    return result.rows[0] ? toCrop(result.rows[0]) : undefined;
  }

  async findVariety(varietyKey: string, cropKey?: string) {
    const result = await this.database.query<VarietyRow>(
      `SELECT ${VARIETY_COLUMNS}
       FROM crop_varieties cv
       JOIN crops c ON c.id = cv.crop_id
       WHERE cv.variety_key = $1 AND cv.active = true AND c.active = true
         AND ($2::text IS NULL OR c.crop_key = $2)`,
      [varietyKey, cropKey ?? null],
    );
    return result.rows[0] ? toVariety(result.rows[0]) : undefined;
  }

  async findFactor(factorKey: string) {
    const result = await this.database.query<FactorRow>(
      `SELECT ${FACTOR_COLUMNS} FROM factor_definitions WHERE factor_key = $1 AND active = true`,
      [factorKey],
    );
    return result.rows[0] ? toFactor(result.rows[0]) : undefined;
  }
}
