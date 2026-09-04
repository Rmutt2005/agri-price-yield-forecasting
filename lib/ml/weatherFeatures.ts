import { isIsoDate } from "@/lib/domain/harvest";
import type { DataOrigin, WeatherObservation } from "@/lib/domain/types";

export type WeatherFeatureWindow = {
  startDate: string;
  endDate: string;
};

export type WeatherFeatureVector = {
  expectedDays: number;
  observedDays: number;
  missingDays: number;
  averageTemperatureC?: number;
  minimumTemperatureC?: number;
  maximumTemperatureC?: number;
  totalRainfallMm?: number;
  averageRelativeHumidityPct?: number;
  rainyDayCount: number;
  dataOrigin?: DataOrigin;
  provenanceCounts: Record<DataOrigin, number>;
};

function dayNumber(date: string) {
  return new Date(`${date}T00:00:00.000Z`).getTime();
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

export function aggregateWeatherFeatures(
  observations: readonly WeatherObservation[],
  window: WeatherFeatureWindow,
): WeatherFeatureVector {
  if (!isIsoDate(window.startDate) || !isIsoDate(window.endDate) || window.startDate > window.endDate) {
    throw new Error("Weather feature window must contain ordered ISO dates");
  }

  const expectedDays = Math.floor((dayNumber(window.endDate) - dayNumber(window.startDate)) / 86_400_000) + 1;
  const records = observations
    .filter((observation) => observation.date >= window.startDate && observation.date <= window.endDate)
    .sort((a, b) => a.date.localeCompare(b.date));
  const observedDays = new Set(records.map((observation) => observation.date)).size;
  const temperatures = records.map((observation) => observation.temperatureAvgC);
  const rainfall = records.map((observation) => observation.rainfallMm);
  const humidity = records.map((observation) => observation.relativeHumidityPct);
  const provenanceCounts: Record<DataOrigin, number> = {
    ACTUAL: records.filter((observation) => observation.dataOrigin === "ACTUAL").length,
    IMPUTED: records.filter((observation) => observation.dataOrigin === "IMPUTED").length,
    SYNTHETIC: records.filter((observation) => observation.dataOrigin === "SYNTHETIC").length,
  };
  const origins = (Object.keys(provenanceCounts) as DataOrigin[])
    .filter((origin) => provenanceCounts[origin] > 0);

  return {
    expectedDays,
    observedDays,
    missingDays: Math.max(0, expectedDays - observedDays),
    averageTemperatureC: temperatures.length
      ? round(temperatures.reduce((sum, value) => sum + value, 0) / temperatures.length)
      : undefined,
    minimumTemperatureC: records.length
      ? round(Math.min(...records.map((observation) => observation.temperatureMinC)))
      : undefined,
    maximumTemperatureC: records.length
      ? round(Math.max(...records.map((observation) => observation.temperatureMaxC)))
      : undefined,
    totalRainfallMm: rainfall.length
      ? round(rainfall.reduce((sum, value) => sum + value, 0))
      : undefined,
    averageRelativeHumidityPct: humidity.length
      ? round(humidity.reduce((sum, value) => sum + value, 0) / humidity.length)
      : undefined,
    rainyDayCount: records.filter((observation) => observation.rainfallMm > 0).length,
    dataOrigin: origins.length === 1 ? origins[0] : undefined,
    provenanceCounts,
  };
}
