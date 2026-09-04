import type {
  AnalysisInput,
  AnalysisResponse,
} from "@/lib/domain/types";
import { getDatabasePool } from "@/db/client";
import { PostgresAnalysisRepository } from "@/lib/repositories/postgresAnalysisRepository";
import type { RepositoryResult } from "@/lib/repositories/types";
import { isPostgresPersistenceEnabled } from "@/lib/repositories/runtime";

export type AnalysisRecord = {
  id: string;
  userId?: string;
  input: AnalysisInput;
  response: AnalysisResponse;
  createdAt: string;
};

export interface AnalysisRepository {
  save(
    input: AnalysisInput,
    response: AnalysisResponse,
    userId?: string,
  ): RepositoryResult<AnalysisRecord>;
  findById(id: string): RepositoryResult<AnalysisRecord | undefined>;
  findByIdForUser(id: string, userId: string): RepositoryResult<AnalysisRecord | undefined>;
  list(): RepositoryResult<readonly AnalysisRecord[]>;
  listForUser(userId: string): RepositoryResult<readonly AnalysisRecord[]>;
}

export class InMemoryAnalysisRepository implements AnalysisRepository {
  private readonly records = new Map<string, AnalysisRecord>();

  save(input: AnalysisInput, response: AnalysisResponse, userId?: string) {
    const record: AnalysisRecord = {
      id: response.analysisId,
      userId,
      input,
      response,
      createdAt: response.predictionTimestamp,
    };
    this.records.set(record.id, record);
    return record;
  }

  findById(id: string) {
    return this.records.get(id);
  }

  findByIdForUser(id: string, userId: string) {
    const record = this.records.get(id);
    return record?.userId === userId ? record : undefined;
  }

  list() {
    return [...this.records.values()].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  }

  listForUser(userId: string) {
    return this.list().filter((record) => record.userId === userId);
  }
}

type AnalysisGlobalState = typeof globalThis & {
  __agriAnalysisRepository?: AnalysisRepository;
};

const analysisGlobalState = globalThis as AnalysisGlobalState;
export const analysisRepository: AnalysisRepository =
  analysisGlobalState.__agriAnalysisRepository ??
  (analysisGlobalState.__agriAnalysisRepository = isPostgresPersistenceEnabled()
    ? new PostgresAnalysisRepository(getDatabasePool())
    : new InMemoryAnalysisRepository());
