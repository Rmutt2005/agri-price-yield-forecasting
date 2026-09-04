import { describe, expect, it } from "vitest";

import {
  calculateDiseaseRisk,
  riskLevelFromScore,
} from "@/lib/domain/risk";

describe("disease risk rules", () => {
  it("maps all five score bands", () => {
    expect(riskLevelFromScore(0)).toBe("VERY_LOW");
    expect(riskLevelFromScore(0.2)).toBe("LOW");
    expect(riskLevelFromScore(0.4)).toBe("MEDIUM");
    expect(riskLevelFromScore(0.6)).toBe("HIGH");
    expect(riskLevelFromScore(0.8)).toBe("VERY_HIGH");
  });

  it("returns a low risk for favorable synthetic conditions", () => {
    const result = calculateDiseaseRisk({
      temperatureAvgC: 24,
      relativeHumidityPct: 60,
      rainfallMm: 0,
      soilMoisturePct: 45,
    });

    expect(result.level).toBe("VERY_LOW");
    expect(result.ruleVersion).toBe("disease-rules-v1");
  });

  it("returns very high risk for extreme wet conditions", () => {
    const result = calculateDiseaseRisk({
      temperatureAvgC: 38,
      relativeHumidityPct: 100,
      rainfallMm: 30,
      soilMoisturePct: 90,
    });

    expect(result.level).toBe("VERY_HIGH");
  });
});
