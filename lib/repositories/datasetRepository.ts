import type {
  DatasetStatus,
  TrainingDataset,
} from "@/lib/domain/types";
import { getDatabasePool } from "@/db/client";
import { PostgresDatasetRepository } from "@/lib/repositories/postgresDatasetRepository";
import type { RepositoryResult } from "@/lib/repositories/types";
import { isPostgresPersistenceEnabled } from "@/lib/repositories/runtime";

export interface DatasetRepository {
  save(dataset: TrainingDataset): RepositoryResult<TrainingDataset>;
  findById(id: string): RepositoryResult<TrainingDataset | undefined>;
  list(): RepositoryResult<readonly TrainingDataset[]>;
  updateStatus(id: string, status: DatasetStatus): RepositoryResult<TrainingDataset | undefined>;
}

export class InMemoryDatasetRepository implements DatasetRepository {
  private readonly datasets: TrainingDataset[] = [];

  save(dataset: TrainingDataset) {
    this.datasets.push(dataset);
    return dataset;
  }

  findById(id: string) {
    return this.datasets.find((dataset) => dataset.id === id);
  }

  list() {
    return [...this.datasets].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  updateStatus(id: string, status: DatasetStatus) {
    const dataset = this.findById(id);
    if (dataset) dataset.status = status;
    return dataset;
  }
}

type DatasetGlobalState = typeof globalThis & {
  __agriDatasetRepository?: DatasetRepository;
};

const datasetGlobalState = globalThis as DatasetGlobalState;
export const datasetRepository: DatasetRepository =
  datasetGlobalState.__agriDatasetRepository ??
  (datasetGlobalState.__agriDatasetRepository = isPostgresPersistenceEnabled()
    ? new PostgresDatasetRepository(getDatabasePool())
    : new InMemoryDatasetRepository());
