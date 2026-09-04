import type { Pool } from "pg";
import { describe, expect, it, vi } from "vitest";

import { PostgresAnalysisRepository } from "@/lib/repositories/postgresAnalysisRepository";
import { PostgresCatalogRepository } from "@/lib/repositories/postgresCatalogRepository";
import { PostgresCultivationRepository } from "@/lib/repositories/postgresCultivationRepository";
import { PostgresDataSourceRepository } from "@/lib/repositories/postgresDataSourceRepository";
import { PostgresDatasetRepository } from "@/lib/repositories/postgresDatasetRepository";
import { PostgresModelRepository } from "@/lib/repositories/postgresModelRepository";
import { PostgresObservationRepository } from "@/lib/repositories/postgresObservationRepository";
import { PostgresSystemStatusRepository } from "@/lib/repositories/postgresSystemStatusRepository";

function poolWithQuery(query: ReturnType<typeof vi.fn>) {
  return { query } as unknown as Pool;
}

const areaRow = {
  id: "11111111-1111-4111-8111-111111111111",
  area_key: "AREA_001",
  name: "พื้นที่หนึ่ง",
  location: "เชียงใหม่",
  latitude: 18.7,
  longitude: 98.9,
  elevation_m: "310",
  data_origin: "SYNTHETIC",
  active: true,
};

const cropRow = {
  id: "22222222-2222-4222-8222-222222222222",
  crop_key: "HEAD_LETTUCE",
  name: "ผักกาดหอมห่อ",
  default_growing_days: "45",
  data_origin: "SYNTHETIC",
  active: true,
};

describe("PostgreSQL repository adapters", () => {
  it("maps catalog rows to stable domain keys", async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [areaRow] })
      .mockResolvedValueOnce({ rows: [cropRow] })
      .mockResolvedValueOnce({ rows: [{
        id: "33333333-3333-4333-8333-333333333333",
        crop_key: "HEAD_LETTUCE",
        variety_key: "HEAD_LETTUCE_STANDARD",
        name: "มาตรฐาน",
        growing_days_override: null,
        data_origin: "SYNTHETIC",
        active: true,
      }] })
      .mockResolvedValueOnce({ rows: [{
        id: "44444444-4444-4444-8444-444444444444",
        factor_key: "soil_ph",
        name: "Soil pH",
        category: "SOIL",
        data_type: "NUMBER",
        unit: "pH",
        description: "pH",
        aggregation_method: "LAST",
        active: true,
      }] });
    const repository = new PostgresCatalogRepository(poolWithQuery(query));

    expect(await repository.listAreas()).toEqual([expect.objectContaining({
      id: areaRow.id,
      key: "AREA_001",
      elevationM: 310,
    })]);
    expect(await repository.listCrops()).toEqual([expect.objectContaining({
      id: cropRow.id,
      key: "HEAD_LETTUCE",
      defaultGrowingDays: 45,
    })]);
    expect(await repository.listVarieties()).toEqual([expect.objectContaining({
      key: "HEAD_LETTUCE_STANDARD",
      cropKey: "HEAD_LETTUCE",
    })]);
    expect(await repository.listFactors()).toEqual([expect.objectContaining({
      key: "soil_ph",
      dataType: "NUMBER",
    })]);
  });

  it("writes normalized observations through parameterized key lookups", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [], rowCount: 1 });
    const repository = new PostgresObservationRepository(poolWithQuery(query));

    const prices = await repository.savePrices([{
      id: "price-1",
      cropKey: "HEAD_LETTUCE",
      date: "2026-01-01",
      price: 42,
      currency: "THB",
      unit: "kg",
      priceType: "WHOLESALE",
      market: "MOC",
      sourceId: "source-moc",
      dataOrigin: "ACTUAL",
    }]);
    const weather = await repository.saveWeather([{
      id: "weather-1",
      areaKey: "AREA_001",
      date: "2026-01-01",
      temperatureMinC: 17,
      temperatureMaxC: 29,
      temperatureAvgC: 23,
      rainfallMm: 4,
      relativeHumidityPct: 70,
      solarRadiation: 18,
      windSpeedMps: 1.2,
      sourceId: "source-moc",
      dataOrigin: "ACTUAL",
    }]);
    const yields = await repository.saveYields([{
      id: "yield-1",
      areaKey: "AREA_001",
      cropKey: "HEAD_LETTUCE",
      harvestDate: "2026-02-15",
      yieldKgPerRai: 725,
      sourceId: "source-moc",
      dataOrigin: "ACTUAL",
    }]);

    expect(prices).toBe(1);
    expect(weather).toBe(1);
    expect(yields).toBe(1);
    expect(query.mock.calls[0]?.[0]).toContain("ON CONFLICT DO NOTHING");
    expect(query.mock.calls[0]?.[1]).toEqual(expect.arrayContaining(["HEAD_LETTUCE", "source-moc"]));
    expect(query.mock.calls[1]?.[1]).toEqual(expect.arrayContaining(["AREA_001", "source-moc"]));
    expect(query.mock.calls[2]?.[0]).toContain("yield_observations");
    expect(query.mock.calls[2]?.[1]).toEqual(expect.arrayContaining(["AREA_001", "HEAD_LETTUCE", "source-moc"]));
  });

  it("maps persisted yield observations for the dashboard read model", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{
      id: "yield-2",
      area_key: "AREA_001",
      crop_key: "HEAD_LETTUCE",
      harvest_date: "2026-02-15",
      yield_kg_per_rai: "725.5",
      source_key: "source-moc",
      data_origin: "ACTUAL",
    }] });
    const yields = await new PostgresObservationRepository(poolWithQuery(query)).listYields();

    expect(yields).toEqual([{
      id: "yield-2",
      areaKey: "AREA_001",
      cropKey: "HEAD_LETTUCE",
      harvestDate: "2026-02-15",
      yieldKgPerRai: 725.5,
      sourceId: "source-moc",
      dataOrigin: "ACTUAL",
    }]);
    expect(query.mock.calls[0]?.[0]).toContain("JOIN data_sources ds");
  });

  it("round-trips cultivation input snapshots", async () => {
    const row = {
      id: "55555555-5555-4555-8555-555555555555",
      user_id: "66666666-6666-4666-8666-666666666666",
      area_key: "AREA_001",
      crop_key: "HEAD_LETTUCE",
      variety_key: "HEAD_LETTUCE_STANDARD",
      planting_date: "2026-09-04",
      area_rai: "2.5",
      growing_days_override: null,
      management_snapshot: {
        factors: { soil_ph: 6.4 },
        costsPerRai: { fertilizerThb: 100, chemicalThb: 50, laborThb: 200, otherThb: 0 },
      },
      status: "PLANNED",
      created_at: "2026-09-04T00:00:00.000Z",
      updated_at: "2026-09-04T00:00:00.000Z",
    };
    const query = vi.fn().mockResolvedValue({ rows: [row] });
    const cycle = await new PostgresCultivationRepository(poolWithQuery(query)).create(
      row.user_id,
      {
        areaKey: row.area_key,
        cropKey: row.crop_key,
        varietyKey: row.variety_key,
        plantingDate: row.planting_date,
        areaRai: 2.5,
        factors: { soil_ph: 6.4 },
        costsPerRai: { fertilizerThb: 100, chemicalThb: 50, laborThb: 200, otherThb: 0 },
      },
    );

    expect(cycle).toMatchObject({
      id: row.id,
      userId: row.user_id,
      input: expect.objectContaining({ areaRai: 2.5, varietyKey: row.variety_key }),
    });
    expect(query.mock.calls[0]?.[1]).toEqual(expect.arrayContaining([row.user_id, row.area_key, row.crop_key]));
  });

  it("stores analysis and dataset snapshots without exposing implementation rows", async () => {
    const response = {
      analysisId: "analysis-1",
      expectedHarvestDate: "2026-10-19",
      yield: { kgPerRai: 700, totalKg: 700, unit: "kg/rai" as const, modelVersion: "yield-baseline-v1" },
      price: { thbPerKg: 42, currency: "THB" as const, unit: "kg" as const, priceType: "WHOLESALE" as const, modelVersion: "price-baseline-v1" },
      diseaseRisk: { score: 0.2, level: "LOW" as const, ruleVersion: "disease-rules-v1" },
      economics: { expectedRevenueThb: 29400, totalCostThb: 350, expectedProfitThb: 29050, breakEvenPriceThbPerKg: 0.5, breakEvenYieldKg: 8.34, profitPerRaiThb: 29050 },
      inputFeatureSchema: ["crop_key"],
      dataQuality: { origin: "SYNTHETIC" as const, warnings: [], stale: false },
      predictionTimestamp: "2026-09-04T00:00:00.000Z",
    };
    const analysisRow = {
      id: "77777777-7777-4777-8777-777777777777",
      user_id: "66666666-6666-4666-8666-666666666666",
      input_snapshot: { areaKey: "AREA_001" },
      response_snapshot: response,
      created_at: "2026-09-04T00:00:00.000Z",
    };
    const analysisQuery = vi.fn().mockImplementation(async (_sql: string, values: unknown[]) => {
      const persistedId = String(values[0]);
      return {
        rows: [{
          ...analysisRow,
          id: persistedId,
          response_snapshot: { ...response, analysisId: persistedId },
        }],
      };
    });
    const savedAnalysis = await new PostgresAnalysisRepository(poolWithQuery(analysisQuery)).save(
      analysisRow.input_snapshot as never,
      response,
      analysisRow.user_id,
    );
    expect(savedAnalysis.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(savedAnalysis.response).toMatchObject({ ...response, analysisId: savedAnalysis.id });
    expect(analysisQuery.mock.calls[0]?.[0]).toContain("response_snapshot");

    const datasetRow = {
      id: "88888888-8888-4888-8888-888888888888",
      dataset_key: "dataset-1",
      version: "v1",
      name: "Dataset",
      uploaded_by: analysisRow.user_id,
      validation_summary: {
        valid: true,
        rowCount: 1,
        validRowCount: 1,
        invalidRowCount: 0,
        detectedColumns: ["areaKey", "cropKey", "yieldKgPerRai"],
        featureColumns: [],
        provenanceCounts: { ACTUAL: 0, IMPUTED: 0, SYNTHETIC: 1 },
        issues: [],
      },
      rows_snapshot: [{ areaKey: "AREA_001", cropKey: "HEAD_LETTUCE", yieldKgPerRai: 700 }],
      data_origin: "SYNTHETIC",
      status: "VALIDATED",
      source_file_name: null,
      artifact_location: "memory-artifact://dataset-1",
      artifact_checksum: "checksum",
      created_at: "2026-09-04T00:00:00.000Z",
    };
    const datasetQuery = vi.fn().mockResolvedValue({ rows: [datasetRow] });
    const savedDataset = await new PostgresDatasetRepository(poolWithQuery(datasetQuery)).save({
      id: "ignored",
      datasetKey: datasetRow.dataset_key,
      version: datasetRow.version,
      name: datasetRow.name,
      uploadedBy: datasetRow.uploaded_by,
      rows: datasetRow.rows_snapshot,
      report: datasetRow.validation_summary,
      dataOrigin: "SYNTHETIC",
      status: "VALIDATED",
      createdAt: "2026-09-04T00:00:00.000Z",
      artifactLocation: datasetRow.artifact_location,
      artifactChecksum: datasetRow.artifact_checksum,
    });
    expect(savedDataset).toMatchObject({ id: datasetRow.id, rows: datasetRow.rows_snapshot });
    expect(datasetQuery.mock.calls[0]?.[0]).toContain("rows_snapshot");
  });

  it("maps source status, system status and model lifecycle reads", async () => {
    const sourceQuery = vi.fn().mockResolvedValue({ rows: [{
      id: "99999999-9999-4999-8999-999999999999",
      source_key: "source-moc",
      name: "MOC",
      source_type: "API",
      priority: "1",
      enabled: true,
      status: "ACTIVE",
      metadata: { purpose: "price" },
      last_success_at: "2026-09-04T00:00:00.000Z",
      last_failure_at: null,
    }] });
    const source = await new PostgresDataSourceRepository(poolWithQuery(sourceQuery)).list();
    expect(source[0]).toMatchObject({ id: "source-moc", priority: 1, metadata: { purpose: "price" } });

    const statusQuery = vi.fn().mockResolvedValue({ rows: [{
      mode: "MAINTENANCE",
      message: "deploy",
      changed_by: "66666666-6666-4666-8666-666666666666",
      created_at: "2026-09-04T00:00:00.000Z",
    }] });
    expect(await new PostgresSystemStatusRepository(poolWithQuery(statusQuery)).get()).toMatchObject({
      mode: "MAINTENANCE",
      message: "deploy",
    });

    const modelQuery = vi.fn().mockResolvedValue({ rows: [{
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      model_key: "yield-baseline",
      version: "yield-baseline-v1",
      model_type: "YIELD",
      target: "yield_kg_per_rai",
      feature_schema: ["crop_key"],
      training_dataset_id: null,
      training_timestamp: "2026-09-04T00:00:00.000Z",
      metrics: {},
      status: "ACTIVE",
      artifact_location: "synthetic://yield-baseline-v1",
      artifact_checksum: null,
      parameters: {},
      activated_at: "2026-09-04T00:00:00.000Z",
    }] });
    expect(await new PostgresModelRepository(poolWithQuery(modelQuery)).getActive("YIELD")).toMatchObject({
      version: "yield-baseline-v1",
      modelType: "YIELD",
    });
  });
});
