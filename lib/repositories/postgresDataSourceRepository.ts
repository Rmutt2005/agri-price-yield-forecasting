import type { Pool, QueryResultRow } from "pg";

import type { DataSource, DataSourceStatus } from "@/lib/domain/types";
import type { DataSourceRepository } from "@/lib/repositories/dataSourceRepository";

type DataSourceRow = QueryResultRow & {
  id: string;
  source_key: string;
  name: string;
  source_type: DataSource["type"];
  priority: number | string;
  enabled: boolean;
  status: DataSourceStatus;
  metadata: unknown;
  last_success_at: Date | string | null;
  last_failure_at: Date | string | null;
};

const SOURCE_COLUMNS = `
  id, source_key, name, source_type, priority, enabled, status, metadata,
  last_success_at, last_failure_at
`;

function iso(value: Date | string | null) {
  return value === null ? undefined : value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function metadata(value: unknown): Record<string, string> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, typeof item === "string" ? item : String(item)]),
  );
}

function toDataSource(row: DataSourceRow): DataSource {
  return {
    id: row.source_key,
    name: row.name,
    type: row.source_type,
    priority: Number(row.priority),
    enabled: row.enabled,
    status: row.status,
    metadata: metadata(row.metadata),
    ...(iso(row.last_success_at) ? { lastSuccessAt: iso(row.last_success_at) } : {}),
    ...(iso(row.last_failure_at) ? { lastFailureAt: iso(row.last_failure_at) } : {}),
  };
}

export class PostgresDataSourceRepository implements DataSourceRepository {
  constructor(private readonly database: Pool) {}

  async list() {
    const result = await this.database.query<DataSourceRow>(
      `SELECT ${SOURCE_COLUMNS} FROM data_sources ORDER BY priority, source_key`,
    );
    return result.rows.map(toDataSource);
  }

  async findByKey(key: string) {
    const result = await this.database.query<DataSourceRow>(
      `SELECT ${SOURCE_COLUMNS}
       FROM data_sources
       WHERE source_key = $1 OR name = $1
       LIMIT 1`,
      [key],
    );
    return result.rows[0] ? toDataSource(result.rows[0]) : undefined;
  }

  async update(
    id: string,
    patch: Partial<Pick<DataSource, "enabled" | "priority" | "status" | "lastSuccessAt" | "lastFailureAt">>,
  ) {
    const fields: string[] = [];
    const values: unknown[] = [id];
    const add = (column: string, value: unknown) => {
      values.push(value);
      fields.push(`${column} = $${values.length}`);
    };
    if (patch.enabled !== undefined) add("enabled", patch.enabled);
    if (patch.priority !== undefined) add("priority", patch.priority);
    if (patch.status !== undefined) add("status", patch.status);
    if (patch.lastSuccessAt !== undefined) add("last_success_at", patch.lastSuccessAt);
    if (patch.lastFailureAt !== undefined) add("last_failure_at", patch.lastFailureAt);

    if (fields.length === 0) return this.findByKey(id);
    const result = await this.database.query<DataSourceRow>(
      `UPDATE data_sources
       SET ${fields.join(", ")}
       WHERE source_key = $1
       RETURNING ${SOURCE_COLUMNS}`,
      values,
    );
    return result.rows[0] ? toDataSource(result.rows[0]) : undefined;
  }
}
