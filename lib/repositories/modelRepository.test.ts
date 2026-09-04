import { describe, expect, it } from "vitest";

import { InMemoryModelRepository, ModelRepositoryError } from "@/lib/repositories/modelRepository";

describe("model repository lifecycle", () => {
  it("activates a candidate and archives the previous active model", () => {
    const repository = new InMemoryModelRepository();
    const candidate = repository.addCandidate({
      id: "model-yield-baseline-v2",
      modelKey: "yield-baseline",
      version: "yield-baseline-v2",
      modelType: "YIELD",
      target: "yield_kg_per_rai",
      featureSchema: ["crop_key", "rainfall_mm"],
      trainingTimestamp: "2026-09-05T00:00:00.000Z",
      metrics: { MAE: 10, RMSE: 15, R2: 0.9 },
      artifactLocation: "in-memory://model-yield-baseline-v2",
    });

    expect(repository.compareCandidate(candidate.id)).toMatchObject({
      candidateModelId: candidate.id,
      activeModelId: "model-yield-baseline-v1",
      status: "INCONCLUSIVE",
    });

    repository.activate(candidate.id);

    expect(repository.getActive("YIELD").id).toBe(candidate.id);
    expect(repository.findById("model-yield-baseline-v1")?.status).toBe("ARCHIVED");
    expect(repository.rollback("model-yield-baseline-v1").id).toBe(
      "model-yield-baseline-v1",
    );
    expect(repository.getActive("YIELD").version).toBe("yield-baseline-v1");
  });

  it("reports a controlled error when no active model exists", () => {
    expect(() => new InMemoryModelRepository([]).getActive("YIELD")).toThrowError(
      new ModelRepositoryError("No active model", "NO_ACTIVE_MODEL"),
    );
  });

  it("rejects a corrupt artifact before activation or prediction", () => {
    const repository = new InMemoryModelRepository();
    const candidate = repository.addCandidate({
      id: "model-yield-corrupt",
      modelKey: "yield-baseline",
      version: "yield-baseline-corrupt",
      modelType: "YIELD",
      target: "yield_kg_per_rai",
      featureSchema: ["crop_key"],
      trainingTimestamp: "2026-09-05T00:00:00.000Z",
      metrics: { MAE: 10, RMSE: 15, R2: 0.9 },
      artifactLocation: "corrupt://model-yield-corrupt",
    });

    expect(() => repository.activate(candidate.id)).toThrowError(
      new ModelRepositoryError("Model artifact is unavailable or corrupt", "CORRUPT_ARTIFACT"),
    );
  });
});
