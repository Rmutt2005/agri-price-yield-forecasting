import type { Area, Crop, ModelVersion, WeatherSummary } from "@/lib/domain/types";

export const YIELD_MODEL_VERSION = "yield-baseline-v1";
export const PRICE_MODEL_VERSION = "price-baseline-v1";
export const PRICE_TARGET_TYPE = "WHOLESALE" as const;

export const YIELD_FEATURE_SCHEMA = [
  "elevation_m",
  "temperature_avg_c",
  "rainfall_mm",
  "relative_humidity_pct",
  "crop_key",
  "expected_harvest_days",
] as const;

const BASE_YIELD_BY_CROP: Record<string, number> = {
  HEAD_LETTUCE: 720,
  CABBAGE: 1_350,
  COS_LETTUCE: 680,
  TAIWAN_BABY_BOK_CHOY: 540,
  JAPANESE_PUMPKIN: 1_050,
};

const BASE_PRICE_BY_CROP: Record<string, number> = {
  HEAD_LETTUCE: 42,
  CABBAGE: 28,
  COS_LETTUCE: 38,
  TAIWAN_BABY_BOK_CHOY: 34,
  JAPANESE_PUMPKIN: 32,
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export function predictYieldKgPerRai({
  crop,
  area,
  weather,
  growingDays,
}: {
  crop: Crop;
  area: Area;
  weather: WeatherSummary;
  growingDays: number;
}) {
  const base = BASE_YIELD_BY_CROP[crop.key] ?? 600;
  const elevationAdjustment = clamp((area.elevationM - 400) / 4000, -0.08, 0.08);
  const temperatureAdjustment = clamp(
    (weather.temperatureAvgC - 23) * 0.008,
    -0.12,
    0.12,
  );
  const rainfallAdjustment = clamp((weather.rainfallMm - 8) * 0.003, -0.1, 0.1);
  const cycleAdjustment = clamp((growingDays - 50) * 0.001, -0.08, 0.08);

  return Math.round(
    clamp(
      base *
        (1 + elevationAdjustment) *
        (1 - temperatureAdjustment) *
        (1 + rainfallAdjustment) *
        (1 + cycleAdjustment),
      100,
      3_000,
    ),
  );
}

export function predictYieldWithModel(
  model: Pick<ModelVersion, "parameters">,
  input: {
    crop: Crop;
    area: Area;
    weather: WeatherSummary;
    growingDays: number;
  },
) {
  const baselineMean = model.parameters?.baselineMeanKgPerRai;
  if (typeof baselineMean === "number" && Number.isFinite(baselineMean)) {
    return Math.round(clamp(baselineMean, 100, 3_000));
  }
  return predictYieldKgPerRai(input);
}

export function forecastPriceThbPerKg({
  crop,
  harvestDate,
}: {
  crop: Crop;
  harvestDate: string;
}) {
  const base = BASE_PRICE_BY_CROP[crop.key] ?? 30;
  const month = Number(harvestDate.slice(5, 7));
  const seasonalAdjustment = Math.sin(((month - 1) / 12) * Math.PI * 2) * 0.08;

  return Number((base * (1 + seasonalAdjustment)).toFixed(2));
}
