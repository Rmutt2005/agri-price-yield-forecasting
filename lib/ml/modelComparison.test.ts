import { describe, expect, it } from "vitest";

import { compareModelToActive } from "@/lib/ml/modelComparison";
import type { ModelVersion } from "@/lib/domain/types";

function model(id: string, metrics: Record<string, number>): ModelVersion {
  return {
    id,
    modelKey: "yield-baseline",
    version: id,
    modelType: "YIELD",
    target: "yield_kg_per_rai",
    featureSchema: ["crop_key"],
    trainingTimestamp: "2026-09-04T00:00:00.000Z",
    metrics,
    status: id === "active" ? "ACTIVE" : "CANDIDATE",
    artifactLocation: "in-memory://test",
  };
}

describe("model comparison", () => {
  it("marks a candidate better when all comparable metrics improve", () => {
    const result = compareModelToActive(
      model("candidate", { MAE: 8, RMSE: 10, R2: 0.92 }),
      model("active", { MAE: 10, RMSE: 12, R2: 0.9 }),
    );

    expect(result.status).toBe("BETTER");
    expect(result.metrics.MAE).toMatchObject({ delta: -2, improves: true });
    expect(result.metrics.R2).toMatchObject({ delta: 0.02, improves: true });
  });

  it("marks a candidate worse and is inconclusive without an active model", () => {
    expect(compareModelToActive(
      model("candidate", { MAE: 12, RMSE: 14, R2: 0.8 }),
      model("active", { MAE: 10, RMSE: 12, R2: 0.9 }),
    ).status).toBe("WORSE");

    expect(compareModelToActive(model("candidate", { MAE: 8 })).status).toBe("INCONCLUSIVE");
  });

  it("does not collapse mixed metric outcomes into a false pass/fail", () => {
    expect(compareModelToActive(
      model("candidate", { MAE: 8, RMSE: 14 }),
      model("active", { MAE: 10, RMSE: 12 }),
    ).status).toBe("INCONCLUSIVE");
  });
});
