import type { Pool, QueryResultRow } from "pg";

import type { DatasetStatus, DataOrigin, TrainingDataset } from "@/lib/domain/types";
import type { DatasetRepository } from "@/lib/repositories/datasetRepository";

type DatasetRow = QueryResultRow & {
  id: string;
  dataset_key: string;
  version: string;
  name: string;
  uploaded_by: string;
  validation_summary: unknown;
  rows_snapshot: unknown;
  data_origin: DataOrigin;
  status: DatasetStatus;
  source_file_name: string | null;
  artifact_location: string | null;
  artifact_checksum: string | null;
  created_at: Date | string;
};

const DATASET_COLUMNS = `
  id, dataset_key, version, name, uploaded_by, validation_summary,
  rows_snapshot, data_origin, status, source_file_name, artifact_location,
  artifact_checksum, created_at
`;

function iso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function asObject(value: unknown) {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function asRows(value: unknown) {
  return Array.isArray(value)
    ? value.filter((row): row is Record<string, unknown> =>
        typeof row === "object" && row !== null && !Array.isArray(row),
      ).map((row) => row as TrainingDataset["rows"][number])
    : [] as TrainingDataset["rows"];
}

function toDataset(row: DatasetRow): TrainingDataset {
  return {
    id: row.id,
    datasetKey: row.dataset_key,
    version: row.version,
    name: row.name,
    uploadedBy: row.uploaded_by,
    rows: asRows(row.rows_snapshot),
    report: asObject(row.validation_summary) as TrainingDataset["report"],
    dataOrigin: row.data_origin,
    status: row.status,
    ...(row.source_file_name === null ? {} : { sourceFileName: row.source_file_name }),
    ...(row.artifact_location === null ? {} : { artifactLocation: row.artifact_location }),
    ...(row.artifact_checksum === null ? {} : { artifactChecksum: row.artifact_checksum }),
    createdAt: iso(row.created_at),
  };
}

export class PostgresDatasetRepository implements DatasetRepository {
  constructor(private readonly database: Pool) {}

  async save(dataset: TrainingDataset) {
    const result = await this.database.query<DatasetRow>(
      `INSERT INTO training_datasets
        (dataset_key, version, name, uploaded_by, validation_summary, rows_snapshot, row_count,
         data_origin, status, source_file_name, artifact_location, artifact_checksum)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8, $9, $10, $11, $12)
       RETURNING ${DATASET_COLUMNS}`,
      [
        dataset.datasetKey,
        dataset.version,
        dataset.name,
        dataset.uploadedBy,
        JSON.stringify(dataset.report),
        JSON.stringify(dataset.rows),
        dataset.rows.length,
        dataset.dataOrigin,
        dataset.status,
        dataset.sourceFileName ?? null,
        dataset.artifactLocation ?? null,
        dataset.artifactChecksum ?? null,
      ],
    );
    const row = result.rows[0];
    if (!row) throw new Error("Dataset insert returned no row");
    return toDataset(row);
  }

  async findById(id: string) {
    const result = await this.database.query<DatasetRow>(
      `SELECT ${DATASET_COLUMNS} FROM training_datasets WHERE id = $1`,
      [id],
    );
    return result.rows[0] ? toDataset(result.rows[0]) : undefined;
  }

  async list() {
    const result = await this.database.query<DatasetRow>(
      `SELECT ${DATASET_COLUMNS} FROM training_datasets ORDER BY created_at DESC, id`,
    );
    return result.rows.map(toDataset);
  }

  async updateStatus(id: string, status: DatasetStatus) {
    const result = await this.database.query<DatasetRow>(
      `UPDATE training_datasets
       SET status = $2
       WHERE id = $1
       RETURNING ${DATASET_COLUMNS}`,
      [id, status],
    );
    return result.rows[0] ? toDataset(result.rows[0]) : undefined;
  }
}
