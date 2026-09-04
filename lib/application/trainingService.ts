import type { ModelVersion } from "@/lib/domain/types";
import { datasetRepository } from "@/lib/repositories/datasetRepository";
import type { DatasetRepository } from "@/lib/repositories/datasetRepository";
import type { ModelRepository } from "@/lib/repositories/modelRepository";
import { modelRepository } from "@/lib/repositories/modelRepository";
import { artifactStore } from "@/lib/repositories/artifactStore";
import type { ArtifactStore } from "@/lib/repositories/artifactStore";

export class TrainingServiceError extends Error {
  constructor(
    message: string,
    public readonly code: "NOT_FOUND" | "INVALID_DATASET",
  ) {
    super(message);
    this.name = "TrainingServiceError";
  }
}

export const TRAINING_SPLIT_SEED = 42;

function round(value: number) {
  return Math.round(value * 10000) / 10000;
}

function seededOrder(length: number) {
  const order = Array.from({ length }, (_, index) => index);
  let state = TRAINING_SPLIT_SEED;
  for (let index = order.length - 1; index > 0; index -= 1) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const swapIndex = state % (index + 1);
    [order[index], order[swapIndex]] = [order[swapIndex], order[index]];
  }
  return order;
}

function splitRows<T>(rows: readonly T[]) {
  const ordered = seededOrder(rows.length).map((index) => rows[index]);
  if (rows.length < 3) {
    return {
      train: ordered.slice(0, Math.max(1, rows.length - 1)),
      validation: [] as T[],
      test: ordered.length > 1 ? ordered.slice(-1) : [] as T[],
    };
  }

  const testCount = Math.max(1, Math.round(rows.length * 0.2));
  const validationCount = Math.max(1, Math.round(rows.length * 0.2));
  return {
    train: ordered.slice(0, rows.length - testCount - validationCount),
    validation: ordered.slice(rows.length - testCount - validationCount, rows.length - testCount),
    test: ordered.slice(rows.length - testCount),
  };
}

function errorMetrics(actual: readonly number[], predicted: number) {
  if (actual.length === 0) return { MAE: 0, RMSE: 0, R2: 0 };
  const absoluteErrors = actual.map((value) => Math.abs(value - predicted));
  const squaredErrors = actual.map((value) => (value - predicted) ** 2);
  const mean = actual.reduce((sum, value) => sum + value, 0) / actual.length;
  const totalVariance = actual.reduce((sum, value) => sum + (value - mean) ** 2, 0);
  const residualSum = squaredErrors.reduce((sum, value) => sum + value, 0);
  return {
    MAE: round(absoluteErrors.reduce((sum, value) => sum + value, 0) / actual.length),
    RMSE: round(Math.sqrt(residualSum / actual.length)),
    R2: totalVariance === 0 ? 1 : round(1 - residualSum / totalVariance),
  };
}

export async function trainYieldCandidate(
  datasetId: string,
  actorId: string,
  repositories: {
    datasets?: DatasetRepository;
    models?: ModelRepository;
    artifacts?: ArtifactStore;
  } = {},
): Promise<ModelVersion> {
  const datasets = repositories.datasets ?? datasetRepository;
  const models = repositories.models ?? modelRepository;
  const artifacts = repositories.artifacts ?? artifactStore;
  const dataset = await datasets.findById(datasetId);
  if (!dataset) throw new TrainingServiceError("Dataset not found", "NOT_FOUND");
  if (!dataset.report.valid || dataset.rows.length === 0) {
    throw new TrainingServiceError(
      "Dataset must pass validation before training",
      "INVALID_DATASET",
    );
  }

  await datasets.updateStatus(datasetId, "TRAINING");
  try {
    const targets = dataset.rows.map((row) => row.yieldKgPerRai).filter(
      (value): value is number => typeof value === "number",
    );
    if (targets.length !== dataset.rows.length || targets.length === 0) {
      throw new TrainingServiceError("No valid yield target", "INVALID_DATASET");
    }

    const split = splitRows(targets);
    const trainMean = split.train.reduce((sum, value) => sum + value, 0) / split.train.length;
    const evaluationRows = split.test.length > 0
      ? split.test
      : split.validation.length > 0
        ? split.validation
        : split.train;
    const metrics = errorMetrics(evaluationRows, trainMean);
    const sequence = (await models
      .list())
      .filter((model) => model.modelType === "YIELD").length + 1;
    const version = `yield-baseline-v${sequence}`;
    const parameters = { baselineMeanKgPerRai: round(trainMean) };
    const artifact = await artifacts.putJson(`model-${version}-${datasetId}`, {
      artifactType: "mean-yield-baseline",
      modelKey: "yield-baseline",
      version,
      featureSchema: ["areaKey", "cropKey", ...dataset.report.featureColumns],
      parameters,
      datasetId,
      createdBy: actorId,
    });
    const candidate = await models.addCandidate({
      id: `model-${version}-${datasetId}`,
      modelKey: "yield-baseline",
      version,
      modelType: "YIELD",
      target: "yield_kg_per_rai",
      featureSchema: ["areaKey", "cropKey", ...dataset.report.featureColumns],
      trainingDatasetId: datasetId,
      trainingTimestamp: new Date().toISOString(),
      metrics: {
        ...metrics,
        TRAIN_ROWS: split.train.length,
        VALIDATION_ROWS: split.validation.length,
        TEST_ROWS: split.test.length,
        SPLIT_SEED: TRAINING_SPLIT_SEED,
      },
      artifactLocation: artifact.location,
      artifactChecksum: artifact.checksum,
      parameters,
    }, actorId);
    await datasets.updateStatus(datasetId, "TRAINED");
    return candidate;
  } catch (error) {
    await datasets.updateStatus(datasetId, "FAILED");
    throw error;
  }
}
