import { DATA_SOURCES } from "@/lib/domain/dataSources";
import type { DataSource } from "@/lib/domain/types";
import { getDatabasePool } from "@/db/client";
import { PostgresDataSourceRepository } from "@/lib/repositories/postgresDataSourceRepository";
import type { RepositoryResult } from "@/lib/repositories/types";
import { isPostgresPersistenceEnabled } from "@/lib/repositories/runtime";

export interface DataSourceRepository {
  list(): RepositoryResult<readonly DataSource[]>;
  findByKey(key: string): RepositoryResult<DataSource | undefined>;
  update(
    id: string,
    patch: Partial<Pick<DataSource, "enabled" | "priority" | "status" | "lastSuccessAt" | "lastFailureAt">>,
  ): RepositoryResult<DataSource | undefined>;
}

export class InMemoryDataSourceRepository implements DataSourceRepository {
  private readonly sources: DataSource[] = DATA_SOURCES.map((source) => ({
    ...source,
    metadata: { ...source.metadata },
  }));

  list() {
    return [...this.sources].sort((a, b) => a.priority - b.priority);
  }

  findByKey(key: string) {
    return this.sources.find((source) => source.id === key || source.name === key);
  }

  update(
    id: string,
    patch: Partial<Pick<DataSource, "enabled" | "priority" | "status" | "lastSuccessAt" | "lastFailureAt">>,
  ) {
    const source = this.sources.find((item) => item.id === id);
    if (!source) return undefined;
    Object.assign(source, patch);
    return source;
  }
}

type DataSourceGlobalState = typeof globalThis & {
  __agriDataSourceRepository?: DataSourceRepository;
};

const dataSourceGlobalState = globalThis as DataSourceGlobalState;
export const dataSourceRepository: DataSourceRepository =
  dataSourceGlobalState.__agriDataSourceRepository ??
  (dataSourceGlobalState.__agriDataSourceRepository = isPostgresPersistenceEnabled()
    ? new PostgresDataSourceRepository(getDatabasePool())
    : new InMemoryDataSourceRepository());
