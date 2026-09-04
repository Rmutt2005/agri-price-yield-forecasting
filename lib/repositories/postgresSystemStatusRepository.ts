import type { Pool, QueryResultRow } from "pg";

import type { SystemMode, SystemStatus } from "@/lib/domain/types";
import type { SystemStatusRepository } from "@/lib/repositories/systemStatusRepository";

type StatusRow = QueryResultRow & {
  mode: SystemMode;
  message: string | null;
  changed_by: string | null;
  created_at: Date | string;
};

function iso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toStatus(row: StatusRow): SystemStatus {
  return {
    mode: row.mode,
    ...(row.message === null ? {} : { message: row.message }),
    ...(row.changed_by === null ? {} : { changedBy: row.changed_by }),
    updatedAt: iso(row.created_at),
  };
}

export class PostgresSystemStatusRepository implements SystemStatusRepository {
  constructor(private readonly database: Pool) {}

  async get() {
    const result = await this.database.query<StatusRow>(
      `SELECT mode, message, changed_by, created_at
       FROM system_status
       ORDER BY created_at DESC, id DESC
       LIMIT 1`,
    );
    return result.rows[0]
      ? toStatus(result.rows[0])
      : { mode: "NORMAL", updatedAt: new Date(0).toISOString() } satisfies SystemStatus;
  }

  async set(mode: SystemMode, message: string | undefined, changedBy: string) {
    const result = await this.database.query<StatusRow>(
      `INSERT INTO system_status (mode, message, changed_by)
       VALUES ($1, $2, $3)
       RETURNING mode, message, changed_by, created_at`,
      [mode, message ?? null, changedBy],
    );
    const row = result.rows[0];
    if (!row) throw new Error("System status insert returned no row");
    return toStatus(row);
  }
}
