import type { Pool, QueryResultRow } from "pg";

import type { AnalysisInput, CostBreakdownPerRai, CultivationCycle, CultivationStatus, ScalarValue } from "@/lib/domain/types";
import type { CultivationRepository } from "@/lib/repositories/cultivationRepository";

type CycleRow = QueryResultRow & {
  id: string;
  user_id: string;
  area_key: string;
  crop_key: string;
  variety_key: string | null;
  planting_date: Date | string;
  area_rai: number | string;
  growing_days_override: number | string | null;
  management_snapshot: unknown;
  status: CultivationStatus;
  created_at: Date | string;
  updated_at: Date | string;
};

const CYCLE_COLUMNS = `
  cc.id, cc.user_id, a.area_key, c.crop_key, cv.variety_key, cc.planting_date,
  cc.area_rai, cc.growing_days_override, cc.management_snapshot, cc.status,
  cc.created_at, cc.updated_at
`;

function iso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : String(value);
}

function dateOnly(value: Date | string) {
  return iso(value).slice(0, 10);
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function scalar(value: unknown): value is ScalarValue {
  return typeof value === "number" || typeof value === "string" || typeof value === "boolean";
}

function costs(value: unknown): CostBreakdownPerRai {
  const object = record(value);
  return {
    fertilizerThb: typeof object.fertilizerThb === "number" ? object.fertilizerThb : 0,
    chemicalThb: typeof object.chemicalThb === "number" ? object.chemicalThb : 0,
    laborThb: typeof object.laborThb === "number" ? object.laborThb : 0,
    otherThb: typeof object.otherThb === "number" ? object.otherThb : 0,
  };
}

function toInput(row: CycleRow): AnalysisInput {
  const snapshot = record(row.management_snapshot);
  const factorsObject = record(snapshot.factors);
  const factors = Object.fromEntries(
    Object.entries(factorsObject).filter(([, value]) => scalar(value)),
  ) as Record<string, ScalarValue>;
  const growingDays = row.growing_days_override === null ? undefined : Number(row.growing_days_override);
  return {
    areaKey: row.area_key,
    cropKey: row.crop_key,
    ...(row.variety_key ? { varietyKey: row.variety_key } : {}),
    plantingDate: dateOnly(row.planting_date),
    areaRai: Number(row.area_rai),
    ...(growingDays === undefined ? {} : { growingDaysOverride: growingDays }),
    factors,
    costsPerRai: costs(snapshot.costsPerRai),
  };
}

function toCycle(row: CycleRow): CultivationCycle {
  return {
    id: row.id,
    userId: row.user_id,
    input: toInput(row),
    status: row.status,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

function snapshot(input: AnalysisInput) {
  return JSON.stringify({
    factors: input.factors ?? {},
    costsPerRai: input.costsPerRai,
  });
}

export class PostgresCultivationRepository implements CultivationRepository {
  constructor(private readonly database: Pool) {}

  async create(userId: string, input: AnalysisInput) {
    const result = await this.database.query<{ id: string }>(
      `INSERT INTO cultivation_cycles
        (user_id, area_id, crop_id, variety_id, planting_date, area_rai,
         growing_days_override, management_snapshot, status)
       SELECT $1, a.id, c.id, cv.id, $2, $3, $4, $5::jsonb, 'PLANNED'
       FROM areas a
       JOIN crops c ON c.crop_key = $6 AND c.active = true
       LEFT JOIN crop_varieties cv
         ON cv.variety_key = $7 AND cv.crop_id = c.id AND cv.active = true
       WHERE a.area_key = $8 AND a.active = true
         AND ($7::text IS NULL OR cv.id IS NOT NULL)
       RETURNING id`,
      [
        userId,
        input.plantingDate,
        input.areaRai,
        input.growingDaysOverride ?? null,
        snapshot(input),
        input.cropKey,
        input.varietyKey ?? null,
        input.areaKey,
      ],
    );
    const id = result.rows[0]?.id;
    if (!id) throw new Error("Cultivation references an unknown catalog value");
    const persisted = await this.database.query<CycleRow>(
      `SELECT ${CYCLE_COLUMNS}
       FROM cultivation_cycles cc
       JOIN areas a ON a.id = cc.area_id
       JOIN crops c ON c.id = cc.crop_id
       LEFT JOIN crop_varieties cv ON cv.id = cc.variety_id
       WHERE cc.id = $1`,
      [id],
    );
    const row = persisted.rows[0];
    if (!row) throw new Error("Cultivation insert returned no row");
    return toCycle(row);
  }

  async findByIdForUser(id: string, userId: string) {
    const result = await this.database.query<CycleRow>(
      `SELECT ${CYCLE_COLUMNS}
       FROM cultivation_cycles cc
       JOIN areas a ON a.id = cc.area_id
       JOIN crops c ON c.id = cc.crop_id
       LEFT JOIN crop_varieties cv ON cv.id = cc.variety_id
       WHERE cc.id = $1 AND cc.user_id = $2`,
      [id, userId],
    );
    return result.rows[0] ? toCycle(result.rows[0]) : undefined;
  }

  async listForUser(userId: string) {
    const result = await this.database.query<CycleRow>(
      `SELECT ${CYCLE_COLUMNS}
       FROM cultivation_cycles cc
       JOIN areas a ON a.id = cc.area_id
       JOIN crops c ON c.id = cc.crop_id
       LEFT JOIN crop_varieties cv ON cv.id = cc.variety_id
       WHERE cc.user_id = $1
       ORDER BY cc.updated_at DESC, cc.id`,
      [userId],
    );
    return result.rows.map(toCycle);
  }

  async updateForUser(
    id: string,
    userId: string,
    input: AnalysisInput,
    status: CultivationStatus = "PLANNED",
  ) {
    const result = await this.database.query<{ id: string }>(
      `UPDATE cultivation_cycles cc
       SET area_id = a.id,
           crop_id = c.id,
           variety_id = cv.id,
           planting_date = $3,
           area_rai = $4,
           growing_days_override = $5,
           management_snapshot = $6::jsonb,
           status = $7,
           updated_at = now()
       FROM areas a
       JOIN crops c ON c.crop_key = $8 AND c.active = true
       LEFT JOIN crop_varieties cv
         ON cv.variety_key = $9 AND cv.crop_id = c.id AND cv.active = true
       WHERE cc.id = $1 AND cc.user_id = $2
         AND a.area_key = $10 AND a.active = true
         AND ($9::text IS NULL OR cv.id IS NOT NULL)
       RETURNING cc.id`,
      [
        id,
        userId,
        input.plantingDate,
        input.areaRai,
        input.growingDaysOverride ?? null,
        snapshot(input),
        status,
        input.cropKey,
        input.varietyKey ?? null,
        input.areaKey,
      ],
    );
    const persistedId = result.rows[0]?.id;
    if (!persistedId) return undefined;
    const persisted = await this.database.query<CycleRow>(
      `SELECT ${CYCLE_COLUMNS}
       FROM cultivation_cycles cc
       JOIN areas a ON a.id = cc.area_id
       JOIN crops c ON c.id = cc.crop_id
       LEFT JOIN crop_varieties cv ON cv.id = cc.variety_id
       WHERE cc.id = $1 AND cc.user_id = $2`,
      [persistedId, userId],
    );
    return persisted.rows[0] ? toCycle(persisted.rows[0]) : undefined;
  }
}
