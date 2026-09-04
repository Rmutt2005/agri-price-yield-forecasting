import { describe, expect, it } from "vitest";

import { buildDashboardChartData } from "@/lib/application/dashboardService";
import type { AnalysisRecord } from "@/lib/repositories/analysisRepository";
import type { PriceObservation, YieldObservation } from "@/lib/domain/types";

const record: AnalysisRecord = {
  id: "analysis-test",
  userId: "user-test",
  input: {
    areaKey: "AREA_001",
    cropKey: "HEAD_LETTUCE",
    plantingDate: "2026-01-01",
    areaRai: 1,
    costsPerRai: {
      fertilizerThb: 100,
      chemicalThb: 50,
      laborThb: 200,
      otherThb: 0,
    },
  },
  response: {
    analysisId: "analysis-test",
    expectedHarvestDate: "2026-02-15",
    yield: { kgPerRai: 700, totalKg: 700, unit: "kg/rai", modelVersion: "yield-baseline-v1" },
    price: { thbPerKg: 42, currency: "THB", unit: "kg", priceType: "WHOLESALE", modelVersion: "price-baseline-v1" },
    diseaseRisk: { score: 0.2, level: "LOW", ruleVersion: "disease-rules-v1" },
    economics: {
      expectedRevenueThb: 29_400,
      totalCostThb: 350,
      expectedProfitThb: 29_050,
      breakEvenPriceThbPerKg: 0.5,
      breakEvenYieldKg: 8.34,
      profitPerRaiThb: 29_050,
    },
    inputFeatureSchema: ["crop_key"],
    dataQuality: { origin: "SYNTHETIC", warnings: [], stale: false },
    predictionTimestamp: "2026-01-01T00:00:00.000Z",
  },
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("dashboard chart read model", () => {
  it("combines historical price, forecast, yield comparison and economics", async () => {
    const result = await buildDashboardChartData(record);

    expect(result.origin).toBe("SYNTHETIC");
    expect(result.price.find((item) => item.date === "2026-02-15")).toMatchObject({
      forecastPrice: 42,
    });
    expect(result.yield.find((item) => item.areaKey === "AREA_001")).toMatchObject({
      observedKgPerRai: expect.any(Number),
      predictedKgPerRai: 700,
    });
    expect(result.economics).toEqual([{
      label: "2026-02-15",
      cost: 350,
      revenue: 29_400,
      profit: 29_050,
    }]);
  });

  it("returns an explicit empty/stale state before the first analysis", async () => {
    await expect(buildDashboardChartData()).resolves.toMatchObject({
      price: [],
      yield: [],
      economics: [],
      stale: true,
      warnings: ["ยังไม่มีผลวิเคราะห์สำหรับบัญชีนี้"],
    });
  });

  it("uses ingested prices and preserves their provenance", async () => {
    const actualPrice: PriceObservation = {
      id: "price-actual",
      cropKey: "HEAD_LETTUCE",
      date: "2026-02-10",
      price: 48,
      currency: "THB",
      unit: "kg",
      priceType: "WHOLESALE",
      market: "MOC",
      sourceId: "source-moc",
      dataOrigin: "ACTUAL",
    };

    const result = await buildDashboardChartData(record, { prices: [actualPrice] });

    expect(result.origin).toBe("ACTUAL");
    expect(result.price).toEqual(expect.arrayContaining([
      { date: "2026-02-10", historicalPrice: 48 },
      { date: "2026-02-15", forecastPrice: 42 },
    ]));
    expect(result.warnings).toContain(
      "กราฟ historical ใช้ข้อมูลราคาที่ ingest แล้วตาม provenance ของ source",
    );
    expect(result.price).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ date: "2026-01-01", historicalPrice: expect.any(Number) }),
    ]));
  });

  it("uses persisted yield observations when available", async () => {
    const actualYield: YieldObservation = {
      id: "yield-actual",
      areaKey: "AREA_001",
      cropKey: "HEAD_LETTUCE",
      harvestDate: "2026-02-15",
      yieldKgPerRai: 812,
      sourceId: "source-moc",
      dataOrigin: "ACTUAL",
    };

    const result = await buildDashboardChartData(record, { yields: [actualYield] });

    expect(result.origin).toBe("ACTUAL");
    expect(result.yield).toEqual(expect.arrayContaining([{
      label: "AREA_001",
      areaKey: "AREA_001",
      observedKgPerRai: 812,
      predictedKgPerRai: 700,
    }]));
    expect(result.warnings).toContain(
      "กราฟ yield ใช้ข้อมูลผลผลิตที่ persist แล้วตาม provenance ของ source",
    );
  });
});
