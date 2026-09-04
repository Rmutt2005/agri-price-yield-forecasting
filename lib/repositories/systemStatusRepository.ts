import type { SystemMode, SystemStatus } from "@/lib/domain/types";
import { getDatabasePool } from "@/db/client";
import { PostgresSystemStatusRepository } from "@/lib/repositories/postgresSystemStatusRepository";
import type { RepositoryResult } from "@/lib/repositories/types";
import { isPostgresPersistenceEnabled } from "@/lib/repositories/runtime";

export interface SystemStatusRepository {
  get(): RepositoryResult<SystemStatus>;
  set(mode: SystemMode, message: string | undefined, changedBy: string): RepositoryResult<SystemStatus>;
}

export class InMemorySystemStatusRepository implements SystemStatusRepository {
  private status: SystemStatus = {
    mode: "NORMAL",
    updatedAt: new Date().toISOString(),
  };

  get() {
    return this.status;
  }

  set(mode: SystemMode, message: string | undefined, changedBy: string) {
    this.status = {
      mode,
      message,
      changedBy,
      updatedAt: new Date().toISOString(),
    };
    return this.status;
  }
}

type SystemStatusGlobalState = typeof globalThis & {
  __agriSystemStatusRepository?: SystemStatusRepository;
};

const systemStatusGlobalState = globalThis as SystemStatusGlobalState;
export const systemStatusRepository: SystemStatusRepository =
  systemStatusGlobalState.__agriSystemStatusRepository ??
  (systemStatusGlobalState.__agriSystemStatusRepository = isPostgresPersistenceEnabled()
    ? new PostgresSystemStatusRepository(getDatabasePool())
    : new InMemorySystemStatusRepository());
