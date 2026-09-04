import type { PriceObservation, WeatherObservation } from "@/lib/domain/types";
import { isIsoDate } from "@/lib/domain/harvest";
import {
  SYNTHETIC_PRICE_OBSERVATIONS,
  SYNTHETIC_WEATHER_OBSERVATIONS,
} from "@/lib/data/syntheticSeed";

export type SourceWindow = {
  startDate: string;
  endDate: string;
};

export class SourceUnavailableError extends Error {
  constructor(sourceId: string) {
    super(`External source ${sourceId} is unavailable`);
    this.name = "SourceUnavailableError";
  }
}

export interface PriceSourceAdapter {
  sourceId: string;
  fetchDailyPrices(window: SourceWindow): Promise<readonly PriceObservation[]>;
}

export interface WeatherSourceAdapter {
  sourceId: string;
  fetchDailyWeather(
    areaKey: string,
    window: SourceWindow,
  ): Promise<readonly WeatherObservation[]>;
}

function inWindow(date: string, window: SourceWindow) {
  return isIsoDate(window.startDate) &&
    isIsoDate(window.endDate) &&
    window.startDate <= window.endDate &&
    date >= window.startDate &&
    date <= window.endDate;
}

class SyntheticPriceSourceAdapter implements PriceSourceAdapter {
  readonly sourceId = "source-synthetic";

  async fetchDailyPrices(window: SourceWindow) {
    return SYNTHETIC_PRICE_OBSERVATIONS.filter((observation) => inWindow(observation.date, window));
  }
}

class SyntheticWeatherSourceAdapter implements WeatherSourceAdapter {
  readonly sourceId = "source-synthetic";

  async fetchDailyWeather(areaKey: string, window: SourceWindow) {
    return SYNTHETIC_WEATHER_OBSERVATIONS.filter((observation) =>
      observation.areaKey === areaKey && inWindow(observation.date, window));
  }
}

class ContractOnlyPriceAdapter implements PriceSourceAdapter {
  constructor(public readonly sourceId: string) {}

  async fetchDailyPrices(_window: SourceWindow): Promise<readonly PriceObservation[]> {
    throw new SourceUnavailableError(this.sourceId);
  }
}

class ContractOnlyWeatherAdapter implements WeatherSourceAdapter {
  constructor(public readonly sourceId: string) {}

  async fetchDailyWeather(
    _areaKey: string,
    _window: SourceWindow,
  ): Promise<readonly WeatherObservation[]> {
    throw new SourceUnavailableError(this.sourceId);
  }
}

export const priceSourceAdapters: readonly PriceSourceAdapter[] = [
  new SyntheticPriceSourceAdapter(),
  new ContractOnlyPriceAdapter("source-moc"),
  new ContractOnlyPriceAdapter("source-nabc-oae"),
  new ContractOnlyPriceAdapter("source-talad-thai"),
];

export const weatherSourceAdapters: readonly WeatherSourceAdapter[] = [
  new SyntheticWeatherSourceAdapter(),
  new ContractOnlyWeatherAdapter("source-weather-api"),
];

export function findPriceSourceAdapter(sourceId: string) {
  return priceSourceAdapters.find((adapter) => adapter.sourceId === sourceId);
}

export function findWeatherSourceAdapter(sourceId: string) {
  return weatherSourceAdapters.find((adapter) => adapter.sourceId === sourceId);
}
