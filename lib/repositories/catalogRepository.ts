import { AREAS, CROP_VARIETIES, CROPS } from "@/lib/domain/catalog";
import { BASELINE_FACTORS } from "@/lib/domain/factorRegistry";
import type { Area, Crop, CropVariety, FactorDefinition } from "@/lib/domain/types";
import { getDatabasePool } from "@/db/client";
import { PostgresCatalogRepository } from "@/lib/repositories/postgresCatalogRepository";
import type { RepositoryResult } from "@/lib/repositories/types";
import { isPostgresPersistenceEnabled } from "@/lib/repositories/runtime";

export interface CatalogRepository {
  listAreas(): RepositoryResult<readonly Area[]>;
  listCrops(): RepositoryResult<readonly Crop[]>;
  listVarieties(cropKey?: string): RepositoryResult<readonly CropVariety[]>;
  listFactors(): RepositoryResult<readonly FactorDefinition[]>;
  findArea(areaKey: string): RepositoryResult<Area | undefined>;
  findCrop(cropKey: string): RepositoryResult<Crop | undefined>;
  findVariety(varietyKey: string, cropKey?: string): RepositoryResult<CropVariety | undefined>;
  findFactor(factorKey: string): RepositoryResult<FactorDefinition | undefined>;
}

export class InMemoryCatalogRepository implements CatalogRepository {
  constructor(
    private readonly areas: readonly Area[] = AREAS,
    private readonly crops: readonly Crop[] = CROPS,
    private readonly varieties: readonly CropVariety[] = CROP_VARIETIES,
    private readonly factors: readonly FactorDefinition[] = BASELINE_FACTORS,
  ) {}

  listAreas() {
    return this.areas;
  }

  listCrops() {
    return this.crops;
  }

  listVarieties(cropKey?: string) {
    return this.varieties.filter((variety) =>
      variety.active && (!cropKey || variety.cropKey === cropKey),
    );
  }

  listFactors() {
    return this.factors;
  }

  findArea(areaKey: string) {
    return this.areas.find((area) => area.key === areaKey && area.active);
  }

  findCrop(cropKey: string) {
    return this.crops.find((crop) => crop.key === cropKey && crop.active);
  }

  findVariety(varietyKey: string, cropKey?: string) {
    return this.varieties.find((variety) =>
      variety.key === varietyKey && variety.active && (!cropKey || variety.cropKey === cropKey),
    );
  }

  findFactor(factorKey: string) {
    return this.factors.find(
      (factor) => factor.key === factorKey && factor.active,
    );
  }
}

export const catalogRepository: CatalogRepository =
  isPostgresPersistenceEnabled()
    ? new PostgresCatalogRepository(getDatabasePool())
    : new InMemoryCatalogRepository();
