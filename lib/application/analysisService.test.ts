import { describe, expect, it } from "vitest";

import {
  analyzeCultivation,
  validateAnalysisInput,
} from "@/lib/application/analysisService";
import { InMemoryModelRepository, ModelRepositoryError } from "@/lib/repositories/modelRepository";
import type { WeatherRepository } from "@/lib/repositories/weatherRepository";
import { getSyntheticWeatherSummary } from "@/lib/data/syntheticData";

const validInput = {
  areaKey: "AREA_001",
  cropKey: "HEAD_LETTUCE",
  plantingDate: "2026-09-04",
  areaRai: 2.5,
  costsPerRai: {
    fertilizerThb: 1_600,
    chemicalThb: 1_200,
    laborThb: 1_300,
    otherThb: 200,
  },
};

describe("analysis service", () => {
  it("validates unknown catalog values and malformed inputs", async () => {
    const result = await validateAnalysisInput({
      ...validInput,
      areaKey: "UNKNOWN",
      plantingDate: "not-a-date",
      areaRai: 0,
      factors: { unknown_factor: 1 },
    });

    expect("issues" in result).toBe(true);
    if ("issues" in result) {
      expect(result.issues.map((issue) => issue.field)).toEqual(
        expect.arrayContaining([
          "areaKey",
          "plantingDate",
          "areaRai",
          "factors.unknown_factor",
        ]),
      );
    }
  });

  it("validates that a variety belongs to the selected crop", async () => {
    const validVariety = await validateAnalysisInput({
      ...validInput,
      varietyKey: "HEAD_LETTUCE_STANDARD",
    });
    expect("input" in validVariety).toBe(true);

    const mismatchedVariety = await validateAnalysisInput({
      ...validInput,
      varietyKey: "CABBAGE_STANDARD",
    });
    expect("issues" in mismatchedVariety).toBe(true);
    if ("issues" in mismatchedVariety) {
      expect(mismatchedVariety.issues).toContainEqual({
        field: "varietyKey",
        message: "ไม่พบสายพันธุ์ของพืชที่เลือก",
      });
    }
  });

  it("uses a validated variety and explicit growing-day override in harvest calculation", async () => {
    const parsed = await validateAnalysisInput({
      ...validInput,
      varietyKey: "HEAD_LETTUCE_STANDARD",
      growingDaysOverride: 20,
    });
    expect("input" in parsed).toBe(true);
    if (!("input" in parsed)) return;

    expect((await analyzeCultivation(parsed.input)).expectedHarvestDate).toBe("2026-09-24");
  });

  it("creates a complete synthetic decision response", async () => {
    const parsed = await validateAnalysisInput(validInput);
    expect("input" in parsed).toBe(true);
    if (!("input" in parsed)) return;

    const result = await analyzeCultivation(parsed.input);
    expect(result.expectedHarvestDate).toBe("2026-10-19");
    expect(result.yield.unit).toBe("kg/rai");
    expect(result.yield.totalKg).toBe(result.yield.kgPerRai * 2.5);
    expect(result.price.currency).toBe("THB");
    expect(result.price.priceType).toBe("WHOLESALE");
    expect(result.diseaseRisk.level).toMatch(
      /VERY_LOW|LOW|MEDIUM|HIGH|VERY_HIGH/,
    );
    expect(result.economics.totalCostThb).toBe(10_750);
    expect(result.dataQuality.origin).toBe("SYNTHETIC");
    expect(result.inputFeatureSchema).toContain("crop_key");
  });

  it("surfaces a controlled error when an active model is unavailable", async () => {
    const parsed = await validateAnalysisInput(validInput);
    expect("input" in parsed).toBe(true);
    if (!("input" in parsed)) return;

    await expect(analyzeCultivation(parsed.input, { models: new InMemoryModelRepository([]) })).rejects.toThrowError(
      new ModelRepositoryError("No active model", "NO_ACTIVE_MODEL"),
    );
  });

  it("falls back explicitly when the requested weather window has no history", async () => {
    const parsed = await validateAnalysisInput(validInput);
    expect("input" in parsed).toBe(true);
    if (!("input" in parsed)) return;

    const noHistoryWeather: WeatherRepository = {
      getSummary: (areaKey) => getSyntheticWeatherSummary(areaKey),
      getFeatures: () => ({
        expectedDays: 46,
        observedDays: 0,
        missingDays: 46,
        rainyDayCount: 0,
        provenanceCounts: { ACTUAL: 0, IMPUTED: 0, SYNTHETIC: 0 },
      }),
    };
    const result = await analyzeCultivation(parsed.input, { weather: noHistoryWeather });

    expect(result.dataQuality.stale).toBe(true);
    expect(result.dataQuality.warnings).toContain(
      "ไม่มี raw weather ครอบคลุมช่วงเพาะปลูก จึงใช้ weather summary สำหรับ development",
    );
    expect(result.dataQuality.origin).toBe("SYNTHETIC");
  });
});
