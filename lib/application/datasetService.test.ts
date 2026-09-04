import { describe, expect, it } from "vitest";

import { validateDatasetRows } from "@/lib/application/datasetService";

describe("dataset validation", () => {
  it("accepts mapped synthetic training rows and reports provenance", async () => {
    const result = await validateDatasetRows({
      rows: [
        { area: "AREA_001", crop: "HEAD_LETTUCE", yield: 700, ph: 6.5 },
      ],
      columnMapping: {
        area: "areaKey",
        crop: "cropKey",
        yield: "yieldKgPerRai",
        ph: "soil_ph",
      },
      dataOrigin: "SYNTHETIC",
    });

    expect(result.report.valid).toBe(true);
    expect(result.report.featureColumns).toContain("soil_ph");
    expect(result.report.provenanceCounts.SYNTHETIC).toBe(1);
    expect(result.rows[0]?.yieldKgPerRai).toBe(700);
  });

  it("reports unknown catalog values and duplicate rows", async () => {
    const result = await validateDatasetRows({
      rows: [
        { areaKey: "UNKNOWN", cropKey: "HEAD_LETTUCE", yieldKgPerRai: 700 },
        { areaKey: "UNKNOWN", cropKey: "HEAD_LETTUCE", yieldKgPerRai: 700 },
      ],
    });

    expect(result.report.valid).toBe(false);
    expect(result.report.issues.map((issue) => issue.field)).toEqual(
      expect.arrayContaining(["areaKey", "row"]),
    );
  });

  it("rejects unknown factors and non-scalar values instead of dropping them", async () => {
    const result = await validateDatasetRows({
      rows: [{
        areaKey: "AREA_001",
        cropKey: "HEAD_LETTUCE",
        yieldKgPerRai: 700,
        unknown_factor: 1,
        soil_ph: { value: 6.5 },
      }],
    });

    expect(result.report.valid).toBe(false);
    expect(result.report.issues.map((issue) => issue.field)).toEqual(
      expect.arrayContaining(["columns.unknown_factor", "soil_ph"]),
    );
    expect(result.rows).toHaveLength(0);
  });
});
