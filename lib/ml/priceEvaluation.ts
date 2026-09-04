import type { PriceObservation, PriceType } from "@/lib/domain/types";
import { findCrop } from "@/lib/domain/catalog";
import { forecastPriceThbPerKg } from "@/lib/ml/baseline";

export type PriceEvaluationPoint = {
  actualPrice: number;
  forecastPrice: number;
  naivePrice: number;
};

export type PriceRegressionMetrics = {
  MAE: number;
  RMSE: number;
  R2: number;
};

export type PriceBaselineComparison = {
  sampleCount: number;
  forecast: PriceRegressionMetrics;
  naive: PriceRegressionMetrics;
  forecastBeatsNaive: boolean;
  maeImprovementPct: number;
};

function round(value: number) {
  return Math.round(value * 10_000) / 10_000;
}

function metrics(points: readonly PriceEvaluationPoint[], prediction: (point: PriceEvaluationPoint) => number) {
  const actual = points.map((point) => point.actualPrice);
  const errors = points.map((point) => point.actualPrice - prediction(point));
  const absoluteError = errors.reduce((sum, error) => sum + Math.abs(error), 0);
  const squaredError = errors.reduce((sum, error) => sum + error ** 2, 0);
  const mean = actual.reduce((sum, value) => sum + value, 0) / actual.length;
  const totalVariance = actual.reduce((sum, value) => sum + (value - mean) ** 2, 0);
  return {
    MAE: round(absoluteError / actual.length),
    RMSE: round(Math.sqrt(squaredError / actual.length)),
    R2: totalVariance === 0 ? (squaredError === 0 ? 1 : 0) : round(1 - squaredError / totalVariance),
  } satisfies PriceRegressionMetrics;
}

export function comparePriceForecasts(points: readonly PriceEvaluationPoint[]): PriceBaselineComparison {
  if (points.length === 0) throw new Error("Price evaluation requires at least one point");
  points.forEach((point, index) => {
    if (![point.actualPrice, point.forecastPrice, point.naivePrice].every(
      (value) => Number.isFinite(value) && value >= 0,
    )) {
      throw new Error(`Price evaluation point ${index} contains an invalid value`);
    }
  });

  const forecast = metrics(points, (point) => point.forecastPrice);
  const naive = metrics(points, (point) => point.naivePrice);
  return {
    sampleCount: points.length,
    forecast,
    naive,
    forecastBeatsNaive: forecast.MAE <= naive.MAE,
    maeImprovementPct: naive.MAE === 0
      ? 0
      : round(((naive.MAE - forecast.MAE) / naive.MAE) * 100),
  };
}

export function buildPriceEvaluationPoints(
  observations: readonly PriceObservation[],
  priceType: PriceType = "WHOLESALE",
) {
  const grouped = new Map<string, PriceObservation[]>();
  observations
    .filter((observation) => observation.priceType === priceType)
    .forEach((observation) => {
      const key = `${observation.cropKey}|${observation.market ?? ""}`;
      const bucket = grouped.get(key) ?? [];
      bucket.push(observation);
      grouped.set(key, bucket);
    });

  const points: PriceEvaluationPoint[] = [];
  for (const records of grouped.values()) {
    records.sort((left, right) => left.date.localeCompare(right.date));
    for (let index = 1; index < records.length; index += 1) {
      const current = records[index];
      const previous = records[index - 1];
      const crop = findCrop(current.cropKey);
      if (!crop) continue;
      points.push({
        actualPrice: current.price,
        forecastPrice: forecastPriceThbPerKg({ crop, harvestDate: current.date }),
        naivePrice: previous.price,
      });
    }
  }
  return points;
}

export function evaluatePriceForecast(
  observations: readonly PriceObservation[],
  priceType: PriceType = "WHOLESALE",
) {
  return comparePriceForecasts(buildPriceEvaluationPoints(observations, priceType));
}
