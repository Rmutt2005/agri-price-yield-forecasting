import type { AnalysisInput, CultivationCycle, CultivationStatus } from "@/lib/domain/types";
import { getDatabasePool } from "@/db/client";
import { PostgresCultivationRepository } from "@/lib/repositories/postgresCultivationRepository";
import type { RepositoryResult } from "@/lib/repositories/types";
import { isPostgresPersistenceEnabled } from "@/lib/repositories/runtime";

export interface CultivationRepository {
  create(userId: string, input: AnalysisInput): RepositoryResult<CultivationCycle>;
  findByIdForUser(id: string, userId: string): RepositoryResult<CultivationCycle | undefined>;
  listForUser(userId: string): RepositoryResult<readonly CultivationCycle[]>;
  updateForUser(
    id: string,
    userId: string,
    input: AnalysisInput,
    status?: CultivationStatus,
  ): RepositoryResult<CultivationCycle | undefined>;
}

export class InMemoryCultivationRepository implements CultivationRepository {
  private readonly cycles = new Map<string, CultivationCycle>();

  create(userId: string, input: AnalysisInput) {
    const now = new Date().toISOString();
    const cycle: CultivationCycle = {
      id: `cultivation-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userId,
      input: structuredClone(input),
      status: "PLANNED",
      createdAt: now,
      updatedAt: now,
    };
    this.cycles.set(cycle.id, cycle);
    return cycle;
  }

  findByIdForUser(id: string, userId: string) {
    const cycle = this.cycles.get(id);
    return cycle?.userId === userId ? cycle : undefined;
  }

  listForUser(userId: string) {
    return [...this.cycles.values()]
      .filter((cycle) => cycle.userId === userId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  updateForUser(id: string, userId: string, input: AnalysisInput, status = "PLANNED" as CultivationStatus) {
    const cycle = this.findByIdForUser(id, userId);
    if (!cycle) return undefined;
    cycle.input = structuredClone(input);
    cycle.status = status;
    cycle.updatedAt = new Date().toISOString();
    return cycle;
  }
}

type CultivationGlobalState = typeof globalThis & {
  __agriCultivationRepository?: CultivationRepository;
};

const cultivationGlobalState = globalThis as CultivationGlobalState;
export const cultivationRepository: CultivationRepository =
  cultivationGlobalState.__agriCultivationRepository ??
  (cultivationGlobalState.__agriCultivationRepository = isPostgresPersistenceEnabled()
    ? new PostgresCultivationRepository(getDatabasePool())
    : new InMemoryCultivationRepository());
