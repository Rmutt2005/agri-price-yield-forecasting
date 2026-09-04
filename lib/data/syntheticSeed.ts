import { AREAS, CROP_VARIETIES, CROPS } from "@/lib/domain/catalog";
import { calculateExpectedHarvestDate } from "@/lib/domain/harvest";
import type {
  DataSource,
  FactorObservation,
  PriceObservation,
  WeatherObservation,
  YieldObservation,
} from "@/lib/domain/types";
import { forecastPriceThbPerKg, predictYieldKgPerRai } from "@/lib/ml/baseline";
import { getSyntheticWeatherSummary } from "@/lib/data/syntheticData";

const SEED_START_DATE = "2026-01-01";
const SYNTHETIC_SOURCE_ID = "source-synthetic";

function addDays(dateString: string, days: number) {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export const SYNTHETIC_DATA_SOURCES: readonly DataSource[] = [
  {
    id: SYNTHETIC_SOURCE_ID,
    name: "Synthetic development seed",
    type: "MANUAL_UPLOAD",
    priority: 99,
    enabled: true,
    status: "ACTIVE",
    metadata: { purpose: "development-only", generatedAt: "2026-09-04" },
  },
];

export const SYNTHETIC_WEATHER_OBSERVATIONS: readonly WeatherObservation[] =
  AREAS.flatMap((area, areaIndex) =>
    Array.from({ length: 30 }, (_, dayIndex) => {
      const base = getSyntheticWeatherSummary(area.key);
      const variation = ((dayIndex + areaIndex) % 5) - 2;
      return {
        id: `weather-synthetic-${area.key}-${dayIndex + 1}`,
        areaKey: area.key,
        date: addDays(SEED_START_DATE, dayIndex),
        temperatureMinC: Number((base.temperatureMinC + variation * 0.2).toFixed(1)),
        temperatureMaxC: Number((base.temperatureMaxC + variation * 0.3).toFixed(1)),
        temperatureAvgC: Number((base.temperatureAvgC + variation * 0.25).toFixed(1)),
        rainfallMm: Number(Math.max(0, base.rainfallMm + variation * 0.8).toFixed(1)),
        relativeHumidityPct: Number(
          Math.max(0, Math.min(100, base.relativeHumidityPct + variation)),
        ),
        solarRadiation: Number((base.solarRadiation - variation * 0.2).toFixed(1)),
        windSpeedMps: Number(Math.max(0, base.windSpeedMps + variation * 0.05).toFixed(2)),
        sourceId: SYNTHETIC_SOURCE_ID,
        dataOrigin: "SYNTHETIC",
      };
    }),
  );

const SYNTHETIC_AREA_FACTORS: Record<string, Record<string, number | string>> = {
  AREA_001: {
    latitude: 18.7883,
    longitude: 98.9853,
    elevation_m: 310,
    soil_type: "loam",
    soil_ph: 6.4,
    sand_pct: 42,
    silt_pct: 38,
    clay_pct: 20,
    organic_matter_pct: 2.8,
    drainage_class: "GOOD",
    water_holding_capacity: 58,
    slope_degree: 3.2,
    soil_moisture_pct: 46,
  },
  AREA_002: {
    latitude: 19.9072,
    longitude: 99.8309,
    elevation_m: 420,
    soil_type: "sandy_loam",
    soil_ph: 6.1,
    sand_pct: 56,
    silt_pct: 29,
    clay_pct: 15,
    organic_matter_pct: 2.2,
    drainage_class: "GOOD",
    water_holding_capacity: 49,
    slope_degree: 4.8,
    soil_moisture_pct: 42,
  },
  AREA_003: {
    latitude: 19.302,
    longitude: 97.9654,
    elevation_m: 610,
    soil_type: "clay_loam",
    soil_ph: 5.9,
    sand_pct: 31,
    silt_pct: 35,
    clay_pct: 34,
    organic_matter_pct: 3.4,
    drainage_class: "MODERATE",
    water_holding_capacity: 67,
    slope_degree: 8.5,
    soil_moisture_pct: 55,
  },
};

const SYNTHETIC_FACTOR_UNITS: Record<string, string> = {
  latitude: "degree",
  longitude: "degree",
  elevation_m: "m",
  soil_ph: "pH",
  sand_pct: "%",
  silt_pct: "%",
  clay_pct: "%",
  organic_matter_pct: "%",
  water_holding_capacity: "%",
  slope_degree: "degree",
  soil_moisture_pct: "%",
};

export const SYNTHETIC_FACTOR_OBSERVATIONS: readonly FactorObservation[] =
  AREAS.flatMap((area) =>
    Object.entries(SYNTHETIC_AREA_FACTORS[area.key] ?? {}).map(([factorKey, value]) => ({
      id: `factor-observation-synthetic-${area.key}-${factorKey}`,
      areaKey: area.key,
      factorKey,
      observedAt: `${SEED_START_DATE}T00:00:00.000Z`,
      value,
      unit: SYNTHETIC_FACTOR_UNITS[factorKey],
      sourceId: SYNTHETIC_SOURCE_ID,
      dataOrigin: "SYNTHETIC" as const,
    })),
  );

export const SYNTHETIC_PRICE_OBSERVATIONS: readonly PriceObservation[] =
  CROPS.flatMap((crop, cropIndex) =>
    Array.from({ length: 90 }, (_, dayIndex) => {
      const date = addDays(SEED_START_DATE, dayIndex);
      const seasonalPulse = Math.sin((dayIndex / 90) * Math.PI * 2) * 0.04;
      const weeklyPulse = ((dayIndex + cropIndex) % 7) * 0.005;
      const base = forecastPriceThbPerKg({ crop, harvestDate: date });
      return {
        id: `price-synthetic-${crop.key}-${dayIndex + 1}`,
        cropKey: crop.key,
        date,
        price: Number((base * (1 + seasonalPulse + weeklyPulse)).toFixed(2)),
        currency: "THB",
        unit: "kg",
        priceType: "WHOLESALE",
        market: "SYNTHETIC_MARKET",
        sourceId: SYNTHETIC_SOURCE_ID,
        dataOrigin: "SYNTHETIC",
      };
    }),
  );

export const SYNTHETIC_YIELD_OBSERVATIONS: readonly YieldObservation[] =
  AREAS.flatMap((area) =>
    CROPS.map((crop) => {
      const weather = getSyntheticWeatherSummary(area.key);
      return {
        id: `yield-synthetic-${area.key}-${crop.key}`,
        areaKey: area.key,
        cropKey: crop.key,
        harvestDate: calculateExpectedHarvestDate(
          SEED_START_DATE,
          crop.defaultGrowingDays,
        ),
        yieldKgPerRai: predictYieldKgPerRai({
          crop,
          area,
          weather,
          growingDays: crop.defaultGrowingDays,
        }),
        sourceId: SYNTHETIC_SOURCE_ID,
        dataOrigin: "SYNTHETIC",
      };
    }),
  );

export const SYNTHETIC_COST_EXAMPLES = AREAS.flatMap((area, areaIndex) =>
  CROPS.slice(0, 3).map((crop, cropIndex) => ({
    id: `cost-synthetic-${area.key}-${crop.key}`,
    areaKey: area.key,
    cropKey: crop.key,
    amountThbPerRai: {
      fertilizerThb: 1_500 + areaIndex * 100 + cropIndex * 80,
      chemicalThb: 1_000 + areaIndex * 80,
      laborThb: 1_250 + cropIndex * 100,
      otherThb: 200,
    },
    sourceId: SYNTHETIC_SOURCE_ID,
    dataOrigin: "SYNTHETIC" as const,
  })),
);

export const SYNTHETIC_SEED = {
  source: SYNTHETIC_DATA_SOURCES,
  areas: AREAS,
  crops: CROPS,
  varieties: CROP_VARIETIES,
  factorObservations: SYNTHETIC_FACTOR_OBSERVATIONS,
  weather: SYNTHETIC_WEATHER_OBSERVATIONS,
  prices: SYNTHETIC_PRICE_OBSERVATIONS,
  yields: SYNTHETIC_YIELD_OBSERVATIONS,
  costs: SYNTHETIC_COST_EXAMPLES,
};
