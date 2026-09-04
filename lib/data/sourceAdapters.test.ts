import { describe, expect, it } from "vitest";

import {
  findPriceSourceAdapter,
  findWeatherSourceAdapter,
  SourceUnavailableError,
} from "@/lib/data/sourceAdapters";

describe("external source adapter contracts", () => {
  it("registers the initial price providers without coupling ingestion to them", () => {
    expect(findPriceSourceAdapter("source-moc")).toBeDefined();
    expect(findPriceSourceAdapter("source-nabc-oae")).toBeDefined();
    expect(findPriceSourceAdapter("source-talad-thai")).toBeDefined();
  });

  it("surfaces provider unavailability for graceful fallback handling", async () => {
    const adapter = findPriceSourceAdapter("source-moc");
    await expect(
      adapter?.fetchDailyPrices({ startDate: "2026-01-01", endDate: "2026-01-02" }),
    ).rejects.toBeInstanceOf(SourceUnavailableError);
  });

  it("provides deterministic synthetic adapters for development", async () => {
    const prices = await findPriceSourceAdapter("source-synthetic")?.fetchDailyPrices({
      startDate: "2026-01-01",
      endDate: "2026-01-02",
    });
    const weather = await findWeatherSourceAdapter("source-synthetic")?.fetchDailyWeather(
      "AREA_001",
      { startDate: "2026-01-01", endDate: "2026-01-02" },
    );

    expect(prices).toHaveLength(10);
    expect(weather).toHaveLength(2);
    expect(prices?.every((record) => record.dataOrigin === "SYNTHETIC")).toBe(true);
  });
});
