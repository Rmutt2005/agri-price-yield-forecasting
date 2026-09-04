import type { Pool } from "pg";

import { getSyntheticWeatherSummary } from "@/lib/data/syntheticData";
import { aggregateWeatherFeatures } from "@/lib/ml/weatherFeatures";
import type { WeatherFeatureVector, WeatherFeatureWindow } from "@/lib/ml/weatherFeatures";
import type { WeatherSummary } from "@/lib/domain/types";
import { PostgresObservationRepository } from "@/lib/repositories/postgresObservationRepository";
import type { WeatherRepository } from "@/lib/repositories/weatherRepository";

export class PostgresWeatherRepository implements WeatherRepository {
  private readonly observations: PostgresObservationRepository;

  constructor(database: Pool) {
    this.observations = new PostgresObservationRepository(database);
  }

  async getSummary(areaKey: string): Promise<WeatherSummary> {
    const records = (await this.observations.listWeather()).filter(
      (observation) => observation.areaKey === areaKey,
    );
    if (records.length === 0) return getSyntheticWeatherSummary(areaKey);
    const average = (values: readonly number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
    const origins = new Set(records.map((record) => record.dataOrigin));
    return {
      temperatureMinC: Math.min(...records.map((record) => record.temperatureMinC)),
      temperatureMaxC: Math.max(...records.map((record) => record.temperatureMaxC)),
      temperatureAvgC: average(records.map((record) => record.temperatureAvgC)),
      rainfallMm: average(records.map((record) => record.rainfallMm)),
      relativeHumidityPct: average(records.map((record) => record.relativeHumidityPct)),
      solarRadiation: average(records.map((record) => record.solarRadiation)),
      windSpeedMps: average(records.map((record) => record.windSpeedMps)),
      dataOrigin: origins.size === 1 ? records[0].dataOrigin : "IMPUTED",
    };
  }

  async getFeatures(areaKey: string, window: WeatherFeatureWindow): Promise<WeatherFeatureVector> {
    const records = (await this.observations.listWeather()).filter(
      (observation) => observation.areaKey === areaKey,
    );
    return aggregateWeatherFeatures(records, window);
  }
}
