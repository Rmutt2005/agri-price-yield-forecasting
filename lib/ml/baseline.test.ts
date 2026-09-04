import { describe, expect, it } from "vitest";

import { CROPS } from "@/lib/domain/catalog";
import { forecastPriceThbPerKg, predictYieldWithModel } from "@/lib/ml/baseline";
import { getSyntheticWeatherSummary } from "@/lib/data/syntheticData";

describe("synthetic baseline forecasts", () => {
  it("uses the configured price for Taiwan baby bok choy", () => {
    const crop = CROPS.find((item) => item.key === "TAIWAN_BABY_BOK_CHOY");
    expect(crop).toBeDefined();
    expect(forecastPriceThbPerKg({ crop: crop!, harvestDate: "2026-01-15" })).toBe(34);
  });

  it("uses trained model parameters after a candidate is activated", () => {
    const crop = CROPS.find((item) => item.key === "HEAD_LETTUCE")!;
    const area = { id: "area", key: "AREA_001", name: "Area", location: "Test", latitude: 0, longitude: 0, elevationM: 500, dataOrigin: "SYNTHETIC" as const, active: true };
    const weather = getSyntheticWeatherSummary(area.key);

    expect(predictYieldWithModel({ parameters: { baselineMeanKgPerRai: 812.4 } }, {
      crop,
      area,
      weather,
      growingDays: crop.defaultGrowingDays,
    })).toBe(812);
  });
});
