import { describe, expect, it } from "vitest";

import { InMemoryObservationRepository } from "@/lib/repositories/observationRepository";
import { SyntheticWeatherRepository } from "@/lib/repositories/weatherRepository";

describe("weather repository", () => {
  it("includes ingested raw observations in feature aggregation", async () => {
    const observations = new InMemoryObservationRepository();
    observations.saveWeather([{
      id: "weather-actual-area-001-2026-02-01",
      areaKey: "AREA_001",
      date: "2026-02-01",
      temperatureMinC: 20,
      temperatureMaxC: 34,
      temperatureAvgC: 27,
      rainfallMm: 2,
      relativeHumidityPct: 64,
      solarRadiation: 22,
      windSpeedMps: 2.1,
      sourceId: "source-actual",
      dataOrigin: "ACTUAL",
    }]);

    const result = await new SyntheticWeatherRepository(observations).getFeatures("AREA_001", {
      startDate: "2026-02-01",
      endDate: "2026-02-01",
    });

    expect(result).toMatchObject({
      expectedDays: 1,
      observedDays: 1,
      missingDays: 0,
      averageTemperatureC: 27,
      dataOrigin: "ACTUAL",
      provenanceCounts: { ACTUAL: 1, IMPUTED: 0, SYNTHETIC: 0 },
    });
  });
});
