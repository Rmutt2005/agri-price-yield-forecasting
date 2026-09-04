import { describe, expect, it } from "vitest";

import { aggregateWeatherFeatures } from "@/lib/ml/weatherFeatures";

const observation = (date: string, rainfallMm: number) => ({
  id: `weather-${date}`,
  areaKey: "AREA_001",
  date,
  temperatureMinC: 18,
  temperatureMaxC: 30,
  temperatureAvgC: 24,
  rainfallMm,
  relativeHumidityPct: 70,
  solarRadiation: 18,
  windSpeedMps: 1.2,
  sourceId: "source-synthetic",
  dataOrigin: "SYNTHETIC" as const,
});

describe("weather feature aggregation", () => {
  it("aggregates raw daily weather and reports missing days", () => {
    const result = aggregateWeatherFeatures(
      [observation("2026-01-01", 4), observation("2026-01-03", 0)],
      { startDate: "2026-01-01", endDate: "2026-01-03" },
    );

    expect(result).toMatchObject({
      expectedDays: 3,
      observedDays: 2,
      missingDays: 1,
      totalRainfallMm: 4,
      rainyDayCount: 1,
      dataOrigin: "SYNTHETIC",
    });
  });

  it("rejects an invalid or reversed window", () => {
    expect(() => aggregateWeatherFeatures([], {
      startDate: "2026-01-03",
      endDate: "2026-01-01",
    })).toThrow();
  });
});
