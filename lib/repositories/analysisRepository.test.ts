import { describe, expect, it } from "vitest";

import { analyzeCultivation } from "@/lib/application/analysisService";
import { InMemoryAnalysisRepository } from "@/lib/repositories/analysisRepository";

describe("analysis repository boundary", () => {
  it("stores and retrieves analysis records without changing the response contract", async () => {
    const repository = new InMemoryAnalysisRepository();
    const input = {
      areaKey: "AREA_001",
      cropKey: "HEAD_LETTUCE",
      plantingDate: "2026-09-04",
      areaRai: 1,
      costsPerRai: {
        fertilizerThb: 0,
        chemicalThb: 0,
        laborThb: 0,
        otherThb: 0,
      },
    };
    const response = await analyzeCultivation(input);
    await repository.save(input, response);

    expect(repository.findById(response.analysisId)?.response).toEqual(response);
    expect(repository.list()).toHaveLength(1);
  });
});
