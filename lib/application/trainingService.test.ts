import { describe, expect, it } from "vitest";

import { validateDatasetRows } from "@/lib/application/datasetService";
import { trainYieldCandidate } from "@/lib/application/trainingService";
import { InMemoryDatasetRepository } from "@/lib/repositories/datasetRepository";
import { InMemoryModelRepository } from "@/lib/repositories/modelRepository";

describe("training lifecycle", () => {
  it("creates a candidate with metrics and keeps it inactive", async () => {
    const datasets = new InMemoryDatasetRepository();
    const models = new InMemoryModelRepository();
    const validation = await validateDatasetRows({
      rows: [
        { areaKey: "AREA_001", cropKey: "HEAD_LETTUCE", yieldKgPerRai: 700 },
        { areaKey: "AREA_002", cropKey: "HEAD_LETTUCE", yieldKgPerRai: 800 },
        { areaKey: "AREA_003", cropKey: "HEAD_LETTUCE", yieldKgPerRai: 900 },
      ],
    });
    const dataset = datasets.save({
      id: "dataset-test",
      datasetKey: "test",
      version: "v1",
      name: "Test dataset",
      uploadedBy: "user-test",
      rows: validation.rows,
      report: validation.report,
      dataOrigin: "SYNTHETIC",
      status: "VALIDATED",
      createdAt: "2026-09-04T00:00:00.000Z",
    });

    const candidate = await trainYieldCandidate(dataset.id, "user-test", {
      datasets,
      models,
    });

    expect(candidate.status).toBe("CANDIDATE");
    expect(candidate.metrics).toMatchObject({
      MAE: expect.any(Number),
      RMSE: expect.any(Number),
      R2: expect.any(Number),
      TRAIN_ROWS: 1,
      VALIDATION_ROWS: 1,
      TEST_ROWS: 1,
      SPLIT_SEED: 42,
    });
    expect(candidate.parameters?.baselineMeanKgPerRai).toBeGreaterThanOrEqual(700);
    expect((await models.getActive("YIELD")).version).toBe("yield-baseline-v1");
  });
});
