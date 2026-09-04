import type { AnalysisRecord } from "@/lib/repositories/analysisRepository";
import type { DataOrigin, PriceObservation, YieldObservation } from "@/lib/domain/types";
import { SYNTHETIC_PRICE_OBSERVATIONS, SYNTHETIC_YIELD_OBSERVATIONS } from "@/lib/data/syntheticSeed";
import { observationRepository } from "@/lib/repositories/observationRepository";

export type DashboardPricePoint = {
  date: string;
  historicalPrice?: number;
  forecastPrice?: number;
};

export type DashboardYieldPoint = {
  label: string;
  areaKey: string;
  observedKgPerRai?: number;
  predictedKgPerRai?: number;
};

export type DashboardEconomicsPoint = {
  label: string;
  cost: number;
  revenue: number;
  profit: number;
};

export type DashboardChartData = {
  price: DashboardPricePoint[];
  yield: DashboardYieldPoint[];
  economics: DashboardEconomicsPoint[];
  origin: DataOrigin;
  stale: boolean;
  warnings: string[];
};

type DashboardDataSources = {
  prices?: readonly PriceObservation[];
  yields?: readonly YieldObservation[];
};

function mergeOrigin(observations: readonly { dataOrigin: DataOrigin }[]): DataOrigin {
  if (observations.some((observation) => observation.dataOrigin === "ACTUAL")) {
    return "ACTUAL";
  }
  if (observations.some((observation) => observation.dataOrigin === "IMPUTED")) {
    return "IMPUTED";
  }
  return "SYNTHETIC";
}

export async function buildDashboardChartData(
  record?: AnalysisRecord,
  dataSources: DashboardDataSources = {},
): Promise<DashboardChartData> {
  if (!record) {
    return {
      price: [],
      yield: [],
      economics: [],
      origin: "SYNTHETIC",
      stale: true,
      warnings: ["ยังไม่มีผลวิเคราะห์สำหรับบัญชีนี้"],
    };
  }

  const { input, response } = record;
  const ingestedPrices = (await (dataSources.prices ?? observationRepository.listPrices()))
    .filter((observation) =>
      observation.cropKey === input.cropKey && observation.priceType === response.price.priceType,
    );
  const historicalPrices = ingestedPrices.length > 0
    ? ingestedPrices
    : SYNTHETIC_PRICE_OBSERVATIONS.filter((observation) =>
        observation.cropKey === input.cropKey && observation.priceType === response.price.priceType,
      );
  const usesIngestedPrices = ingestedPrices.length > 0;
  const price: DashboardPricePoint[] = historicalPrices
    .sort((left, right) => left.date.localeCompare(right.date))
    .map((observation) => ({
      date: observation.date,
      historicalPrice: observation.price,
    }));
  const forecastPoint = price.find((point) => point.date === response.expectedHarvestDate);
  if (forecastPoint) {
    forecastPoint.forecastPrice = response.price.thbPerKg;
  } else {
    price.push({
      date: response.expectedHarvestDate,
      forecastPrice: response.price.thbPerKg,
    });
  }

  const ingestedYields = await (dataSources.yields ?? observationRepository.listYields());
  const historicalYields = ingestedYields.length > 0
    ? ingestedYields
    : SYNTHETIC_YIELD_OBSERVATIONS;
  const usesIngestedYields = ingestedYields.length > 0;
  const yieldByArea = new Map<string, DashboardYieldPoint>();
  historicalYields
    .filter((observation) => observation.cropKey === input.cropKey)
    .forEach((observation) => {
      yieldByArea.set(observation.areaKey, {
        label: observation.areaKey,
        areaKey: observation.areaKey,
        observedKgPerRai: observation.yieldKgPerRai,
      });
    });
  const selectedYield = yieldByArea.get(input.areaKey) ?? {
    label: input.areaKey,
    areaKey: input.areaKey,
  };
  selectedYield.predictedKgPerRai = response.yield.kgPerRai;
  yieldByArea.set(input.areaKey, selectedYield);

  return {
    price,
    yield: [...yieldByArea.values()],
    economics: [{
      label: response.expectedHarvestDate,
      cost: response.economics.totalCostThb,
      revenue: response.economics.expectedRevenueThb,
      profit: response.economics.expectedProfitThb,
    }],
    // The chart can contain a real/imputed ingested series even when the
    // current analysis itself still used synthetic weather/model inputs.
    origin: mergeOrigin([
      ...(usesIngestedPrices ? ingestedPrices : []),
      ...(usesIngestedYields ? ingestedYields : []),
      ...(!usesIngestedPrices && !usesIngestedYields ? [{ dataOrigin: "SYNTHETIC" as const }] : []),
    ]),
    stale: response.dataQuality.stale,
    warnings: [
      ...response.dataQuality.warnings,
      usesIngestedPrices
        ? "กราฟ historical ใช้ข้อมูลราคาที่ ingest แล้วตาม provenance ของ source"
        : "กราฟ historical ใช้ข้อมูลสังเคราะห์สำหรับ development",
      usesIngestedYields
        ? "กราฟ yield ใช้ข้อมูลผลผลิตที่ persist แล้วตาม provenance ของ source"
        : "กราฟ yield ใช้ข้อมูลสังเคราะห์สำหรับ development",
    ],
  };
}
