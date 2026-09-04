import { describe, expect, it } from "vitest";

import {
  normalizePriceRecords,
  normalizeWeatherRecords,
  normalizeYieldRecords,
} from "@/lib/application/ingestionService";

describe("ingestion normalization", () => {
  it("rejects mixed price types/units before persistence", async () => {
    const result = await normalizePriceRecords("source-synthetic", [
      {
        cropKey: "HEAD_LETTUCE",
        date: "2026-01-01",
        price: 42,
        priceType: "WHOLESALE",
        currency: "THB",
        unit: "kg",
        dataOrigin: "SYNTHETIC",
      },
      {
        cropKey: "HEAD_LETTUCE",
        date: "2026-01-02",
        price: 50,
        priceType: "RETAIL",
        currency: "USD",
        unit: "kg",
      },
    ]);

    expect(result.records).toHaveLength(1);
    expect(result.issues.map((item) => item.field)).toContain("records[1].currency");
    expect(result.records[0]?.priceType).toBe("WHOLESALE");
  });

  it("normalizes weather observations with synthetic provenance", async () => {
    const result = await normalizeWeatherRecords("source-synthetic", [
      {
        areaKey: "AREA_001",
        date: "2026-01-01",
        temperatureMinC: 17,
        temperatureMaxC: 29,
        temperatureAvgC: 23,
        rainfallMm: 4,
        relativeHumidityPct: 70,
        solarRadiation: 18,
        windSpeedMps: 1.2,
        dataOrigin: "SYNTHETIC",
      },
    ]);

    expect(result.issues).toHaveLength(0);
    expect(result.records[0]).toMatchObject({
      areaKey: "AREA_001",
      dataOrigin: "SYNTHETIC",
      sourceId: "source-synthetic",
    });
  });

  it("does not accept records from a disabled source", async () => {
    const result = await normalizePriceRecords("source-moc", [
      {
        cropKey: "HEAD_LETTUCE",
        date: "2026-01-01",
        price: 42,
        priceType: "WHOLESALE",
      },
    ]);

    expect(result.records).toHaveLength(0);
    expect(result.issues).toEqual([
      { field: "sourceKey", message: "data source นี้ยังไม่เปิดใช้งาน" },
    ]);
  });

  it("normalizes yield observations and rejects invalid target values", async () => {
    const result = await normalizeYieldRecords("source-synthetic", [
      {
        areaKey: "AREA_001",
        cropKey: "HEAD_LETTUCE",
        harvestDate: "2026-02-15",
        yieldKgPerRai: 725,
        dataOrigin: "ACTUAL",
      },
      {
        areaKey: "AREA_001",
        cropKey: "HEAD_LETTUCE",
        harvestDate: "not-a-date",
        yieldKgPerRai: -1,
      },
    ]);

    expect(result.records).toHaveLength(1);
    expect(result.records[0]).toMatchObject({
      areaKey: "AREA_001",
      cropKey: "HEAD_LETTUCE",
      yieldKgPerRai: 725,
      dataOrigin: "ACTUAL",
      sourceId: "source-synthetic",
    });
    expect(result.issues.map((item) => item.field)).toEqual([
      "records[1].harvestDate",
      "records[1].yieldKgPerRai",
    ]);
  });
});
