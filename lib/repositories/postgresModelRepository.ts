import type { Pool, PoolClient, QueryResultRow } from "pg";

import { withTransaction } from "@/db/transaction";
import type { ModelComparison, ModelStatus, ModelType, ModelVersion } from "@/lib/domain/types";
import { compareModelToActive } from "@/lib/ml/modelComparison";
import type { ModelRepository } from "@/lib/repositories/modelRepository";
import { ModelRepositoryError } from "@/lib/repositories/modelCore";
import type { ArtifactStore } from "@/lib/repositories/artifactStore";

type ModelRow = QueryResultRow & {
  id: string;
  model_key: string;
  version: string;
  model_type: ModelType;
  target: string;
  feature_schema: unknown;
  training_dataset_id: string | null;
  training_timestamp: Date | string;
  metrics: unknown;
  status: ModelStatus;
  artifact_location: string | null;
  artifact_checksum: string | null;
  parameters: unknown;
  activated_at: Date | string | null;
};

const MODEL_COLUMNS = `
  id, model_key, version, model_type, target, feature_schema, training_dataset_id,
  training_timestamp, metrics, status, artifact_location, artifact_checksum,
  parameters, activated_at
`;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function iso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function nullableIso(value: Date | string | null) {
  return value === null ? undefined : iso(value);
}

function objectOfNumbers(value: unknown) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => typeof item === "number" && Number.isFinite(item)),
  );
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function toModel(row: ModelRow): ModelVersion {
  const activatedAt = nullableIso(row.activated_at);
  return {
    id: row.id,
    modelKey: row.model_key,
    version: row.version,
    modelType: row.model_type,
    target: row.target,
    featureSchema: stringArray(row.feature_schema),
    ...(row.training_dataset_id ? { trainingDatasetId: row.training_dataset_id } : {}),
    trainingTimestamp: iso(row.training_timestamp),
    metrics: objectOfNumbers(row.metrics),
    status: row.status,
    ...(row.artifact_location === null ? {} : { artifactLocation: row.artifact_location }),
    ...(row.artifact_checksum === null ? {} : { artifactChecksum: row.artifact_checksum }),
    ...(Object.keys(objectOfNumbers(row.parameters)).length > 0 ? { parameters: objectOfNumbers(row.parameters) } : {}),
    ...(activatedAt ? { activatedAt } : {}),
  };
}

function uuidOrNull(value: string | undefined) {
  return value && UUID_PATTERN.test(value) ? value : null;
}

export class PostgresModelRepository implements ModelRepository {
  constructor(
    private readonly database: Pool,
    private readonly artifacts?: ArtifactStore,
  ) {}

  async list() {
    const result = await this.database.query<ModelRow>(
      `SELECT ${MODEL_COLUMNS}
       FROM model_versions
       ORDER BY training_timestamp DESC, id`,
    );
    return result.rows.map(toModel);
  }

  async findById(id: string) {
    const result = await this.database.query<ModelRow>(
      `SELECT ${MODEL_COLUMNS} FROM model_versions WHERE id = $1`,
      [id],
    );
    return result.rows[0] ? toModel(result.rows[0]) : undefined;
  }

  async getActive(modelType: ModelType) {
    const result = await this.database.query<ModelRow>(
      `SELECT ${MODEL_COLUMNS}
       FROM model_versions
       WHERE model_type = $1 AND status = 'ACTIVE'
       LIMIT 1`,
      [modelType],
    );
    const row = result.rows[0];
    if (!row) throw new ModelRepositoryError("No active model", "NO_ACTIVE_MODEL");
    const model = toModel(row);
    await this.assertArtifactUsable(model);
    return model;
  }

  async addCandidate(input: Omit<ModelVersion, "status">, createdBy?: string) {
    const result = await this.database.query<ModelRow>(
      `INSERT INTO model_versions
        (model_key, version, model_type, target, feature_schema, training_dataset_id,
         training_timestamp, metrics, status, artifact_location, artifact_checksum,
         parameters, created_by)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8::jsonb, 'CANDIDATE', $9, $10, $11::jsonb, $12)
       RETURNING ${MODEL_COLUMNS}`,
      [
        input.modelKey,
        input.version,
        input.modelType,
        input.target,
        JSON.stringify(input.featureSchema),
        uuidOrNull(input.trainingDatasetId),
        input.trainingTimestamp,
        JSON.stringify(input.metrics),
        input.artifactLocation ?? null,
        input.artifactChecksum ?? null,
        JSON.stringify(input.parameters ?? {}),
        uuidOrNull(createdBy),
      ],
    );
    const row = result.rows[0];
    if (!row) throw new Error("Model insert returned no row");
    return toModel(row);
  }

  async compareCandidate(id: string) {
    const candidate = await this.findById(id);
    if (!candidate) throw new ModelRepositoryError("Model not found", "NOT_FOUND");
    if (candidate.status !== "CANDIDATE") {
      throw new ModelRepositoryError("Only candidate models can be compared", "INVALID_STATUS");
    }
    const activeResult = await this.database.query<ModelRow>(
      `SELECT ${MODEL_COLUMNS}
       FROM model_versions
       WHERE model_type = $1 AND status = 'ACTIVE'
       LIMIT 1`,
      [candidate.modelType],
    );
    return compareModelToActive(candidate, activeResult.rows[0] ? toModel(activeResult.rows[0]) : undefined);
  }

  async activate(id: string) {
    return this.changeStatus(id, "CANDIDATE", "ACTIVE");
  }

  async rollback(id: string) {
    return this.changeStatus(id, "ARCHIVED", "ACTIVE");
  }

  private async changeStatus(id: string, requiredStatus: ModelStatus, nextStatus: "ACTIVE") {
    return withTransaction(this.database, async (client) => {
      const targetResult = await client.query<ModelRow>(
        `SELECT ${MODEL_COLUMNS} FROM model_versions WHERE id = $1 FOR UPDATE`,
        [id],
      );
      const targetRow = targetResult.rows[0];
      if (!targetRow) throw new ModelRepositoryError("Model not found", "NOT_FOUND");
      const target = toModel(targetRow);
      if (target.status !== requiredStatus) {
        throw new ModelRepositoryError(
          requiredStatus === "CANDIDATE"
            ? "Only candidate models can be activated"
            : "Only archived models can be rolled back",
          "INVALID_STATUS",
        );
      }
      await this.assertArtifactUsable(target);
      await client.query(
        `UPDATE model_versions
         SET status = 'ARCHIVED'
         WHERE model_type = $1 AND status = 'ACTIVE' AND id <> $2`,
        [target.modelType, id],
      );
      const result = await client.query<ModelRow>(
        `UPDATE model_versions
         SET status = $2, activated_at = now()
         WHERE id = $1
         RETURNING ${MODEL_COLUMNS}`,
        [id, nextStatus],
      );
      const row = result.rows[0];
      if (!row) throw new ModelRepositoryError("Model not found", "NOT_FOUND");
      return toModel(row);
    });
  }

  private async assertArtifactUsable(model: ModelVersion) {
    if (!model.artifactLocation || model.artifactLocation.startsWith("corrupt://")) {
      throw new ModelRepositoryError("Model artifact is unavailable or corrupt", "CORRUPT_ARTIFACT");
    }
    const baselineMean = model.parameters?.baselineMeanKgPerRai;
    if (baselineMean !== undefined && (!Number.isFinite(baselineMean) || baselineMean < 0)) {
      throw new ModelRepositoryError("Model parameters are corrupt", "CORRUPT_ARTIFACT");
    }
    if (this.artifacts && (model.artifactLocation.startsWith("memory-artifact://") || model.artifactLocation.startsWith("file-artifact://"))) {
      try {
        const available = await this.artifacts.exists(model.artifactLocation, model.artifactChecksum);
        if (!available) {
          throw new ModelRepositoryError("Model artifact is unavailable or corrupt", "CORRUPT_ARTIFACT");
        }
      } catch (error) {
        if (error instanceof ModelRepositoryError) throw error;
        throw new ModelRepositoryError("Model artifact is unavailable or corrupt", "CORRUPT_ARTIFACT");
      }
    }
  }
}
