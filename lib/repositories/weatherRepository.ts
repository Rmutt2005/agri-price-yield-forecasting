import type { WeatherSummary } from "@/lib/domain/types";
import { getSyntheticWeatherSummary } from "@/lib/data/syntheticData";
import { SYNTHETIC_WEATHER_OBSERVATIONS } from "@/lib/data/syntheticSeed";
import { aggregateWeatherFeatures } from "@/lib/ml/weatherFeatures";
import type { WeatherFeatureVector, WeatherFeatureWindow } from "@/lib/ml/weatherFeatures";
import { observationRepository } from "@/lib/repositories/observationRepository";
import type { ObservationRepository } from "@/lib/repositories/observationRepository";
import { getDatabasePool } from "@/db/client";
import { PostgresWeatherRepository } from "@/lib/repositories/postgresWeatherRepository";
import type { RepositoryResult } from "@/lib/repositories/types";
import { isPostgresPersistenceEnabled } from "@/lib/repositories/runtime";

export interface WeatherRepository {
  getSummary(areaKey: string): RepositoryResult<WeatherSummary>;
  getFeatures(areaKey: string, window: WeatherFeatureWindow): RepositoryResult<WeatherFeatureVector>;
}

export class SyntheticWeatherRepository implements WeatherRepository {
  constructor(
    private readonly observationStore: Pick<ObservationRepository, "listWeather"> = observationRepository,
  ) {}

  getSummary(areaKey: string) {
    return getSyntheticWeatherSummary(areaKey);
  }

  async getFeatures(areaKey: string, window: WeatherFeatureWindow) {
    const observations = new Map(
      SYNTHETIC_WEATHER_OBSERVATIONS
        .filter((observation) => observation.areaKey === areaKey)
        .map((observation) => [
          `${observation.areaKey}|${observation.date}|${observation.sourceId}`,
          observation,
        ]),
    );
    const storedObservations = await this.observationStore.listWeather();
    storedObservations
      .filter((observation) => observation.areaKey === areaKey)
      .forEach((observation) => {
        observations.set(
          `${observation.areaKey}|${observation.date}|${observation.sourceId}`,
          observation,
        );
      });
    return aggregateWeatherFeatures(
      [...observations.values()],
      window,
    );
  }
}

export const weatherRepository: WeatherRepository =
  isPostgresPersistenceEnabled()
    ? new PostgresWeatherRepository(getDatabasePool())
    : new SyntheticWeatherRepository();
