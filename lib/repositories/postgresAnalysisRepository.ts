import { randomUUID } from "node:crypto";
import type { Pool, QueryResultRow } from "pg";

import type { AnalysisInput, AnalysisResponse } from "@/lib/domain/types";
import type { AnalysisRecord, AnalysisRepository } from "@/lib/repositories/analysisRepository";

type AnalysisRow = QueryResultRow & {
  id: string;
  user_id: string | null;
  input_snapshot: unknown;
  response_snapshot: unknown;
  created_at: Date | string;
};

const ANALYSIS_COLUMNS = `
  id, user_id, input_snapshot, response_snapshot, created_at
`;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function iso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toRecord(row: AnalysisRow): AnalysisRecord | undefined {
  if (typeof row.response_snapshot !== "object" || row.response_snapshot === null) return undefined;
  return {
    id: row.id,
    ...(row.user_id ? { userId: row.user_id } : {}),
    input: row.input_snapshot as AnalysisInput,
    response: row.response_snapshot as AnalysisResponse,
    createdAt: iso(row.created_at),
  };
}

function userIdOrNull(userId: string | undefined) {
  if (userId === undefined) return null;
  if (!UUID_PATTERN.test(userId)) {
    throw new Error("PostgreSQL analysis records require a UUID user id");
  }
  return userId;
}

export class PostgresAnalysisRepository implements AnalysisRepository {
  constructor(private readonly database: Pool) {}

  async save(input: AnalysisInput, response: AnalysisResponse, userId?: string) {
    const id = randomUUID();
    const persistedResponse: AnalysisResponse = {
      ...response,
      analysisId: id,
    };
    const result = await this.database.query<AnalysisRow>(
      `INSERT INTO analyses
        (id, user_id, input_snapshot, expected_harvest_date, data_quality, response_snapshot)
       VALUES ($1, $2, $3::jsonb, $4, $5::jsonb, $6::jsonb)
       RETURNING ${ANALYSIS_COLUMNS}`,
      [
        id,
        userIdOrNull(userId),
        JSON.stringify(input),
        persistedResponse.expectedHarvestDate,
        JSON.stringify(persistedResponse.dataQuality),
        JSON.stringify(persistedResponse),
      ],
    );
    const record = result.rows[0] ? toRecord(result.rows[0]) : undefined;
    if (!record) throw new Error("Analysis insert returned no response snapshot");
    return record;
  }

  async findById(id: string) {
    const result = await this.database.query<AnalysisRow>(
      `SELECT ${ANALYSIS_COLUMNS} FROM analyses WHERE id = $1 AND response_snapshot IS NOT NULL`,
      [id],
    );
    return result.rows[0] ? toRecord(result.rows[0]) : undefined;
  }

  async findByIdForUser(id: string, userId: string) {
    const result = await this.database.query<AnalysisRow>(
      `SELECT ${ANALYSIS_COLUMNS}
       FROM analyses
       WHERE id = $1 AND user_id = $2 AND response_snapshot IS NOT NULL`,
      [id, userId],
    );
    return result.rows[0] ? toRecord(result.rows[0]) : undefined;
  }

  async list() {
    const result = await this.database.query<AnalysisRow>(
      `SELECT ${ANALYSIS_COLUMNS}
       FROM analyses
       WHERE response_snapshot IS NOT NULL
       ORDER BY created_at DESC, id`,
    );
    return result.rows.flatMap((row) => {
      const record = toRecord(row);
      return record ? [record] : [];
    });
  }

  async listForUser(userId: string) {
    const result = await this.database.query<AnalysisRow>(
      `SELECT ${ANALYSIS_COLUMNS}
       FROM analyses
       WHERE user_id = $1 AND response_snapshot IS NOT NULL
       ORDER BY created_at DESC, id`,
      [userId],
    );
    return result.rows.flatMap((row) => {
      const record = toRecord(row);
      return record ? [record] : [];
    });
  }
}
