import type {
  FactorObservation,
  PriceObservation,
  WeatherObservation,
  YieldObservation,
} from "@/lib/domain/types";
import { getDatabasePool } from "@/db/client";
import { PostgresObservationRepository } from "@/lib/repositories/postgresObservationRepository";
import type { RepositoryResult } from "@/lib/repositories/types";
import { isPostgresPersistenceEnabled } from "@/lib/repositories/runtime";

export interface ObservationRepository {
  saveFactors(records: readonly FactorObservation[]): RepositoryResult<number>;
  savePrices(records: readonly PriceObservation[]): RepositoryResult<number>;
  saveWeather(records: readonly WeatherObservation[]): RepositoryResult<number>;
  saveYields(records: readonly YieldObservation[]): RepositoryResult<number>;
  listFactors(): RepositoryResult<readonly FactorObservation[]>;
  listPrices(): RepositoryResult<readonly PriceObservation[]>;
  listWeather(): RepositoryResult<readonly WeatherObservation[]>;
  listYields(): RepositoryResult<readonly YieldObservation[]>;
}

export class InMemoryObservationRepository implements ObservationRepository {
  private readonly factors: FactorObservation[] = [];
  private readonly prices: PriceObservation[] = [];
  private readonly weather: WeatherObservation[] = [];
  private readonly yields: YieldObservation[] = [];

  saveFactors(records: readonly FactorObservation[]) {
    const existing = new Set(
      this.factors.map((record) => `${record.areaKey}|${record.cultivationId ?? ""}|${record.factorKey}|${record.observedAt}|${record.sourceId}`),
    );
    let inserted = 0;
    records.forEach((record) => {
      const key = `${record.areaKey}|${record.cultivationId ?? ""}|${record.factorKey}|${record.observedAt}|${record.sourceId}`;
      if (!existing.has(key)) {
        this.factors.push(record);
        existing.add(key);
        inserted += 1;
      }
    });
    return inserted;
  }

  savePrices(records: readonly PriceObservation[]) {
    const existing = new Set(
      this.prices.map((record) => `${record.cropKey}|${record.date}|${record.priceType}|${record.market ?? ""}|${record.sourceId}`),
    );
    let inserted = 0;
    records.forEach((record) => {
      const key = `${record.cropKey}|${record.date}|${record.priceType}|${record.market ?? ""}|${record.sourceId}`;
      if (!existing.has(key)) {
        this.prices.push(record);
        existing.add(key);
        inserted += 1;
      }
    });
    return inserted;
  }

  saveWeather(records: readonly WeatherObservation[]) {
    const existing = new Set(
      this.weather.map((record) => `${record.areaKey}|${record.date}|${record.sourceId}`),
    );
    let inserted = 0;
    records.forEach((record) => {
      const key = `${record.areaKey}|${record.date}|${record.sourceId}`;
      if (!existing.has(key)) {
        this.weather.push(record);
        existing.add(key);
        inserted += 1;
      }
    });
    return inserted;
  }

  saveYields(records: readonly YieldObservation[]) {
    const existing = new Set(
      this.yields.map((record) => `${record.areaKey}|${record.cropKey}|${record.harvestDate}|${record.sourceId}`),
    );
    let inserted = 0;
    records.forEach((record) => {
      const key = `${record.areaKey}|${record.cropKey}|${record.harvestDate}|${record.sourceId}`;
      if (!existing.has(key)) {
        this.yields.push(record);
        existing.add(key);
        inserted += 1;
      }
    });
    return inserted;
  }

  listFactors() {
    return [...this.factors];
  }

  listPrices() {
    return [...this.prices];
  }

  listWeather() {
    return [...this.weather];
  }

  listYields() {
    return [...this.yields];
  }
}

type ObservationGlobalState = typeof globalThis & {
  __agriObservationRepository?: ObservationRepository;
};

const observationGlobalState = globalThis as ObservationGlobalState;
export const observationRepository: ObservationRepository =
  observationGlobalState.__agriObservationRepository ??
  (observationGlobalState.__agriObservationRepository = isPostgresPersistenceEnabled()
    ? new PostgresObservationRepository(getDatabasePool())
    : new InMemoryObservationRepository());
