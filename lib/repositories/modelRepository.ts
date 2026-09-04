import type { ModelComparison, ModelStatus, ModelType, ModelVersion } from "@/lib/domain/types";
import { DISEASE_RULE_VERSION } from "@/lib/domain/risk";
import {
  PRICE_MODEL_VERSION,
  YIELD_FEATURE_SCHEMA,
  YIELD_MODEL_VERSION,
} from "@/lib/ml/baseline";
import { evaluatePriceForecast } from "@/lib/ml/priceEvaluation";
import { SYNTHETIC_PRICE_OBSERVATIONS } from "@/lib/data/syntheticSeed";
import { compareModelToActive } from "@/lib/ml/modelComparison";
import { getDatabasePool } from "@/db/client";
import { PostgresModelRepository } from "@/lib/repositories/postgresModelRepository";
import type { RepositoryResult } from "@/lib/repositories/types";
import { isPostgresPersistenceEnabled } from "@/lib/repositories/runtime";
import { artifactStore } from "@/lib/repositories/artifactStore";
import { ModelRepositoryError } from "@/lib/repositories/modelCore";

export { ModelRepositoryError } from "@/lib/repositories/modelCore";

const SYNTHETIC_PRICE_BASELINE = evaluatePriceForecast(SYNTHETIC_PRICE_OBSERVATIONS, "WHOLESALE");

export const INITIAL_MODELS: ModelVersion[] = [
  {
    id: "model-yield-baseline-v1",
    modelKey: "yield-baseline",
    version: YIELD_MODEL_VERSION,
    modelType: "YIELD",
    target: "yield_kg_per_rai",
    featureSchema: [...YIELD_FEATURE_SCHEMA],
    trainingDatasetId: "synthetic-seed-v1",
    trainingTimestamp: "2026-09-04T00:00:00.000Z",
    // The formula baseline has no held-out evaluation yet; do not expose
    // perfect placeholder metrics that would make every candidate look worse.
    metrics: {},
    status: "ACTIVE",
    artifactLocation: "in-memory://yield-baseline-v1",
    activatedAt: "2026-09-04T00:00:00.000Z",
  },
  {
    id: "model-price-baseline-v1",
    modelKey: "price-baseline",
    version: PRICE_MODEL_VERSION,
    modelType: "PRICE",
    target: "price_thb_per_kg",
    featureSchema: ["crop_key", "harvest_month", "price_type"],
    trainingDatasetId: "synthetic-seed-v1",
    trainingTimestamp: "2026-09-04T00:00:00.000Z",
    metrics: {
      MAE: SYNTHETIC_PRICE_BASELINE.forecast.MAE,
      RMSE: SYNTHETIC_PRICE_BASELINE.forecast.RMSE,
      R2: SYNTHETIC_PRICE_BASELINE.forecast.R2,
      NAIVE_MAE: SYNTHETIC_PRICE_BASELINE.naive.MAE,
      NAIVE_RMSE: SYNTHETIC_PRICE_BASELINE.naive.RMSE,
      NAIVE_R2: SYNTHETIC_PRICE_BASELINE.naive.R2,
      EVAL_ROWS: SYNTHETIC_PRICE_BASELINE.sampleCount,
    },
    status: "ACTIVE",
    artifactLocation: "in-memory://price-baseline-v1",
    activatedAt: "2026-09-04T00:00:00.000Z",
  },
  {
    id: "model-disease-rules-v1",
    modelKey: "disease-rules",
    version: DISEASE_RULE_VERSION,
    modelType: "DISEASE",
    target: "disease_risk_level",
    featureSchema: [
      "temperature_avg_c",
      "relative_humidity_pct",
      "rainfall_mm",
      "soil_moisture_pct",
    ],
    trainingTimestamp: "2026-09-04T00:00:00.000Z",
    metrics: {},
    status: "ACTIVE",
    artifactLocation: "in-memory://disease-rules-v1",
    activatedAt: "2026-09-04T00:00:00.000Z",
  },
];

export interface ModelRepository {
  list(): RepositoryResult<readonly ModelVersion[]>;
  findById(id: string): RepositoryResult<ModelVersion | undefined>;
  getActive(modelType: ModelType): RepositoryResult<ModelVersion>;
  addCandidate(input: Omit<ModelVersion, "status">, createdBy?: string): RepositoryResult<ModelVersion>;
  compareCandidate(id: string): RepositoryResult<ModelComparison>;
  activate(id: string): RepositoryResult<ModelVersion>;
  rollback(id: string): RepositoryResult<ModelVersion>;
}

export class InMemoryModelRepository implements ModelRepository {
  private readonly models: ModelVersion[];

  constructor(initialModels: readonly ModelVersion[] = INITIAL_MODELS) {
    this.models = initialModels.map((model) => ({
      ...model,
      featureSchema: [...model.featureSchema],
      metrics: { ...model.metrics },
      parameters: model.parameters ? { ...model.parameters } : undefined,
    }));
  }

  list() {
    return [...this.models].sort((a, b) =>
      b.trainingTimestamp.localeCompare(a.trainingTimestamp),
    );
  }

  findById(id: string) {
    return this.models.find((model) => model.id === id);
  }

  getActive(modelType: ModelType) {
    const model = this.models.find(
      (candidate) => candidate.modelType === modelType && candidate.status === "ACTIVE",
    );
    if (!model) throw new ModelRepositoryError("No active model", "NO_ACTIVE_MODEL");
    this.assertArtifactUsable(model);
    return model;
  }

  addCandidate(input: Omit<ModelVersion, "status">) {
    const candidate: ModelVersion = { ...input, status: "CANDIDATE" };
    this.models.push(candidate);
    return candidate;
  }

  compareCandidate(id: string) {
    const candidate = this.findById(id);
    if (!candidate) throw new ModelRepositoryError("Model not found", "NOT_FOUND");
    if (candidate.status !== "CANDIDATE") {
      throw new ModelRepositoryError(
        "Only candidate models can be compared",
        "INVALID_STATUS",
      );
    }
    const active = this.models.find(
      (model) => model.modelType === candidate.modelType && model.status === "ACTIVE",
    );
    return compareModelToActive(candidate, active);
  }

  activate(id: string) {
    const candidate = this.findById(id);
    if (!candidate) throw new ModelRepositoryError("Model not found", "NOT_FOUND");
    if (candidate.status !== "CANDIDATE") {
      throw new ModelRepositoryError(
        "Only candidate models can be activated",
        "INVALID_STATUS",
      );
    }
    this.assertArtifactUsable(candidate);

    this.models.forEach((model) => {
      if (model.modelType === candidate.modelType && model.status === "ACTIVE") {
        model.status = "ARCHIVED";
      }
    });
    candidate.status = "ACTIVE";
    candidate.activatedAt = new Date().toISOString();
    return candidate;
  }

  rollback(id: string) {
    const target = this.findById(id);
    if (!target) throw new ModelRepositoryError("Model not found", "NOT_FOUND");
    if (target.status !== "ARCHIVED") {
      throw new ModelRepositoryError(
        "Only archived models can be rolled back",
        "INVALID_STATUS",
      );
    }
    this.assertArtifactUsable(target);

    this.models.forEach((model) => {
      if (model.modelType === target.modelType && model.status === "ACTIVE") {
        model.status = "ARCHIVED";
      }
    });
    target.status = "ACTIVE";
    target.activatedAt = new Date().toISOString();
    return target;
  }

  private assertArtifactUsable(model: ModelVersion) {
    if (!model.artifactLocation || model.artifactLocation.startsWith("corrupt://")) {
      throw new ModelRepositoryError("Model artifact is unavailable or corrupt", "CORRUPT_ARTIFACT");
    }
    const baselineMean = model.parameters?.baselineMeanKgPerRai;
    if (baselineMean !== undefined &&
        (!Number.isFinite(baselineMean) || baselineMean < 0)) {
      throw new ModelRepositoryError("Model parameters are corrupt", "CORRUPT_ARTIFACT");
    }
  }
}

type ModelGlobalState = typeof globalThis & {
  __agriModelRepository?: ModelRepository;
};

const modelGlobalState = globalThis as ModelGlobalState;
export const modelRepository: ModelRepository =
  modelGlobalState.__agriModelRepository ??
  (modelGlobalState.__agriModelRepository = isPostgresPersistenceEnabled()
    ? new PostgresModelRepository(getDatabasePool(), artifactStore)
    : new InMemoryModelRepository());
