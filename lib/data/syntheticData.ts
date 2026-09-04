import type { WeatherSummary } from "@/lib/domain/types";

const WEATHER_BY_AREA: Record<string, WeatherSummary> = {
  AREA_001: {
    temperatureMinC: 17.2,
    temperatureMaxC: 29.4,
    temperatureAvgC: 23.3,
    rainfallMm: 9.4,
    relativeHumidityPct: 72,
    solarRadiation: 18.2,
    windSpeedMps: 1.8,
    dataOrigin: "SYNTHETIC",
  },
  AREA_002: {
    temperatureMinC: 16.4,
    temperatureMaxC: 28.6,
    temperatureAvgC: 22.5,
    rainfallMm: 12.1,
    relativeHumidityPct: 76,
    solarRadiation: 17.5,
    windSpeedMps: 1.6,
    dataOrigin: "SYNTHETIC",
  },
  AREA_003: {
    temperatureMinC: 14.9,
    temperatureMaxC: 26.8,
    temperatureAvgC: 20.9,
    rainfallMm: 15.3,
    relativeHumidityPct: 81,
    solarRadiation: 16.9,
    windSpeedMps: 1.4,
    dataOrigin: "SYNTHETIC",
  },
};

export function getSyntheticWeatherSummary(areaKey: string): WeatherSummary {
  return (
    WEATHER_BY_AREA[areaKey] ?? {
      temperatureMinC: 18,
      temperatureMaxC: 30,
      temperatureAvgC: 24,
      rainfallMm: 8,
      relativeHumidityPct: 70,
      solarRadiation: 18,
      windSpeedMps: 1.5,
      dataOrigin: "SYNTHETIC",
    }
  );
}
