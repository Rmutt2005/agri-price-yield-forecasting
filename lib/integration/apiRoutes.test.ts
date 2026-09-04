import { describe, expect, it } from "vitest";

import { GET as getAnalysis, POST as postAnalysis } from "@/app/api/analysis/route";
import { GET as getAnalysisById } from "@/app/api/analysis/[id]/route";
import { POST as postRegister } from "@/app/api/auth/register/route";
import { GET as getCultivations, POST as postCultivation } from "@/app/api/cultivations/route";
import { GET as getCultivationById } from "@/app/api/cultivations/[id]/route";
import { POST as postDataset } from "@/app/api/datasets/route";
import { POST as postTrain } from "@/app/api/datasets/[id]/train/route";
import { GET as getDataSources } from "@/app/api/data-sources/route";
import { GET as getDashboard } from "@/app/api/dashboard/route";
import { POST as postPrices } from "@/app/api/ingestion/prices/route";
import { POST as postWeather } from "@/app/api/ingestion/weather/route";
import { POST as postYields } from "@/app/api/ingestion/yields/route";
import { GET as getSystemStatus, PATCH as patchSystemStatus } from "@/app/api/admin/system-status/route";
import { GET as getMe } from "@/app/api/me/route";
import { GET as getModels } from "@/app/api/models/route";
import { POST as postActivate } from "@/app/api/models/[id]/activate/route";
import { POST as postRollback } from "@/app/api/models/[id]/rollback/route";
import { GET as getUsers } from "@/app/api/users/route";
import { PATCH as patchUserStatus } from "@/app/api/users/[id]/route";
import { GET as getVarieties } from "@/app/api/varieties/route";
import { authRepository } from "@/lib/repositories/authRepository";

const jsonHeaders = { "Content-Type": "application/json" };

function jsonRequest(path: string, body: unknown, cookie?: string) {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { ...jsonHeaders, ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  });
}

function cookieFrom(response: Response) {
  const setCookie = response.headers.get("set-cookie");
  return setCookie?.split(";", 1)[0];
}

async function readJson<T>(response: Response) {
  return (await response.json()) as T;
}

describe("API route integration", () => {
  it("serves crop varieties as a crop-scoped catalog", async () => {
    const response = await getVarieties(new Request("http://localhost/api/varieties?cropKey=HEAD_LETTUCE"));
    expect(response.status).toBe(200);
    expect(await readJson<{ data: Array<{ key: string; cropKey: string }> }>(response)).toEqual({
      data: [{
        id: "variety-head_lettuce",
        cropKey: "HEAD_LETTUCE",
        key: "HEAD_LETTUCE_STANDARD",
        name: "สายพันธุ์มาตรฐานสำหรับ development",
        dataOrigin: "SYNTHETIC",
        active: true,
      }],
    });
  });

  it("keeps user analysis and cultivation records scoped to the session", async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const registerResponse = await postRegister(jsonRequest("/api/auth/register", {
      fullName: "Integration User",
      email: `integration-${suffix}@example.com`,
      password: "password123",
      confirmPassword: "password123",
    }));
    expect(registerResponse.status).toBe(201);
    const cookie = cookieFrom(registerResponse);
    expect(cookie).toBeDefined();

    const meResponse = await getMe(new Request("http://localhost/api/me", {
      headers: { cookie: cookie! },
    }));
    expect(meResponse.status).toBe(200);

    const analysisResponse = await postAnalysis(jsonRequest("/api/analysis", {
      areaKey: "AREA_001",
      cropKey: "HEAD_LETTUCE",
      plantingDate: "2026-09-04",
      areaRai: 2,
      costsPerRai: { fertilizerThb: 100, chemicalThb: 50, laborThb: 200, otherThb: 0 },
    }, cookie));
    expect(analysisResponse.status).toBe(200);
    const analysis = await readJson<{ analysisId: string }>(analysisResponse);

    const dashboardResponse = await getDashboard(new Request("http://localhost/api/dashboard", {
      headers: { cookie: cookie! },
    }));
    expect(dashboardResponse.status).toBe(200);
    const dashboard = await readJson<{
      data: { analysisId: string } | null;
      charts: {
        price: Array<{ forecastPrice?: number }>;
        yield: Array<{ predictedKgPerRai?: number }>;
      };
    }>(dashboardResponse);
    expect(dashboard.data?.analysisId).toBe(analysis.analysisId);
    expect(dashboard.charts.price).toEqual(expect.arrayContaining([
      expect.objectContaining({ forecastPrice: expect.any(Number) }),
    ]));
    expect(dashboard.charts.yield).toEqual(expect.arrayContaining([
      expect.objectContaining({ predictedKgPerRai: expect.any(Number) }),
    ]));

    const analysisListResponse = await getAnalysis(new Request("http://localhost/api/analysis", {
      headers: { cookie: cookie! },
    }));
    expect(analysisListResponse.status).toBe(200);
    expect((await readJson<{ data: Array<{ analysisId: string }> }>(analysisListResponse)).data.map((item) => item.analysisId)).toContain(analysis.analysisId);

    const cultivationResponse = await postCultivation(jsonRequest("/api/cultivations", {
      areaKey: "AREA_001",
      cropKey: "HEAD_LETTUCE",
      plantingDate: "2026-09-04",
      areaRai: 2,
      costsPerRai: { fertilizerThb: 100, chemicalThb: 50, laborThb: 200, otherThb: 0 },
    }, cookie));
    expect(cultivationResponse.status).toBe(201);
    const cultivation = await readJson<{ cultivation: { id: string } }>(cultivationResponse);
    expect((await getCultivations(new Request("http://localhost/api/cultivations", { headers: { cookie: cookie! } }))).status).toBe(200);

    const detailResponse = await getCultivationById(
      new Request(`http://localhost/api/cultivations/${cultivation.cultivation.id}`, { headers: { cookie: cookie! } }),
      { params: { id: cultivation.cultivation.id } },
    );
    expect(detailResponse.status).toBe(200);

    const anotherUser = await authRepository.register({
      fullName: "Other Integration User",
      email: `other-${suffix}@example.com`,
      password: "password123",
    });
    const crossUserResponse = await getAnalysisById(
      new Request(`http://localhost/api/analysis/${analysis.analysisId}`, { headers: { cookie: `agri_session=${anotherUser.sessionToken}` } }),
      { params: { id: analysis.analysisId } },
    );
    expect(crossUserResponse.status).toBe(404);
    const otherDashboardResponse = await getDashboard(new Request("http://localhost/api/dashboard", {
      headers: { cookie: `agri_session=${anotherUser.sessionToken}` },
    }));
    expect(otherDashboardResponse.status).toBe(200);
    const otherDashboard = await readJson<{ data: unknown; charts: { yield: unknown[] } }>(otherDashboardResponse);
    expect(otherDashboard.data).toBeNull();
    expect(otherDashboard.charts.yield).toHaveLength(0);
    const regularUsersResponse = await getUsers(new Request("http://localhost/api/users", { headers: { cookie: cookie! } }));
    expect(regularUsersResponse.status).toBe(403);
    const regularSourcesResponse = await getDataSources(new Request("http://localhost/api/data-sources", { headers: { cookie: cookie! } }));
    expect(regularSourcesResponse.status).toBe(403);
    const regularStatusResponse = await patchUserStatus(
      jsonRequest("/api/users/unknown", { active: false }, cookie),
      { params: { id: "unknown" } },
    );
    expect(regularStatusResponse.status).toBe(403);
  });

  it("runs the officer dataset-to-active-model flow and can roll back", async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const officer = await authRepository.register({
      fullName: "Integration Officer",
      email: `officer-${suffix}@example.com`,
      password: "password123",
      role: "OFFICER",
    });
    const cookie = `agri_session=${officer.sessionToken}`;

    const datasetResponse = await postDataset(jsonRequest("/api/datasets", {
      name: `Integration dataset ${suffix}`,
      dataOrigin: "SYNTHETIC",
      rows: [
        { areaKey: "AREA_001", cropKey: "HEAD_LETTUCE", yieldKgPerRai: 700 },
        { areaKey: "AREA_002", cropKey: "HEAD_LETTUCE", yieldKgPerRai: 800 },
        { areaKey: "AREA_003", cropKey: "HEAD_LETTUCE", yieldKgPerRai: 900 },
      ],
    }, cookie));
    expect(datasetResponse.status).toBe(201);
    const dataset = await readJson<{ dataset: { id: string } }>(datasetResponse);

    const csvFile = new File([
      "area,crop,yield,soil_ph\nAREA_001,HEAD_LETTUCE,710,6.4\nAREA_002,HEAD_LETTUCE,780,6.1",
    ], "integration.csv", { type: "text/csv" });
    const csvForm = new FormData();
    csvForm.append("name", `CSV dataset ${suffix}`);
    csvForm.append("dataOrigin", "SYNTHETIC");
    csvForm.append("file", csvFile);
    csvForm.append("columnMapping", JSON.stringify({
      area: "areaKey",
      crop: "cropKey",
      yield: "yieldKgPerRai",
    }));
    const csvResponse = await postDataset(new Request("http://localhost/api/datasets", {
      method: "POST",
      headers: { cookie },
      body: csvForm,
    }));
    expect(csvResponse.status).toBe(201);
    expect((await readJson<{ dataset: { report: { valid: boolean } } }>(csvResponse)).dataset.report.valid).toBe(true);

    const trainResponse = await postTrain(
      new Request(`http://localhost/api/datasets/${dataset.dataset.id}/train`, { method: "POST", headers: { cookie } }),
      { params: { id: dataset.dataset.id } },
    );
    expect(trainResponse.status).toBe(201);
    const trained = await readJson<{ model: { id: string; version: string; parameters?: Record<string, number> } }>(trainResponse);
    expect(trained.model.parameters?.baselineMeanKgPerRai).toEqual(expect.any(Number));

    const modelsResponse = await getModels(new Request("http://localhost/api/models", {
      headers: { cookie },
    }));
    expect(modelsResponse.status).toBe(200);
    expect(await readJson<{ comparisons: Array<{ candidateModelId: string; status: string }> }>(modelsResponse)).toMatchObject({
      comparisons: [expect.objectContaining({
        candidateModelId: trained.model.id,
        status: "INCONCLUSIVE",
      })],
    });

    const activateResponse = await postActivate(
      jsonRequest(`/api/models/${trained.model.id}/activate`, { confirm: true }, cookie),
      { params: { id: trained.model.id } },
    );
    expect(activateResponse.status).toBe(200);

    const analysisResponse = await postAnalysis(jsonRequest("/api/analysis", {
      areaKey: "AREA_001",
      cropKey: "HEAD_LETTUCE",
      plantingDate: "2026-09-04",
      areaRai: 1,
      costsPerRai: { fertilizerThb: 0, chemicalThb: 0, laborThb: 0, otherThb: 0 },
    }, cookie));
    expect(analysisResponse.status).toBe(200);
    const analysis = await readJson<{ yield: { kgPerRai: number; modelVersion: string } }>(analysisResponse);
    expect(analysis.yield.kgPerRai).toBe(trained.model.parameters?.baselineMeanKgPerRai);
    expect(analysis.yield.modelVersion).toBe(trained.model.version);

    const rollbackResponse = await postRollback(
      jsonRequest("/api/models/model-yield-baseline-v1/rollback", { confirm: true }, cookie),
      { params: { id: "model-yield-baseline-v1" } },
    );
    expect(rollbackResponse.status).toBe(200);
  });

  it("normalizes officer ingestion and blocks mutations during maintenance", async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const admin = await authRepository.register({
      fullName: "Integration Admin",
      email: `admin-${suffix}@example.com`,
      password: "password123",
      role: "ADMIN",
    });
    const cookie = `agri_session=${admin.sessionToken}`;

    const priceResponse = await postPrices(jsonRequest("/api/ingestion/prices", {
      sourceKey: "source-synthetic",
      records: [{
        cropKey: "TAIWAN_BABY_BOK_CHOY",
        date: "2026-08-01",
        price: 34,
        priceType: "WHOLESALE",
        dataOrigin: "SYNTHETIC",
      }],
    }, cookie));
    expect(priceResponse.status).toBe(200);
    expect((await readJson<{ accepted: number }>(priceResponse)).accepted).toBe(1);

    const duplicatePriceResponse = await postPrices(jsonRequest("/api/ingestion/prices", {
      sourceKey: "source-synthetic",
      records: [{
        cropKey: "TAIWAN_BABY_BOK_CHOY",
        date: "2026-08-01",
        price: 34,
        priceType: "WHOLESALE",
        dataOrigin: "SYNTHETIC",
      }],
    }, cookie));
    expect(duplicatePriceResponse.status).toBe(200);
    expect(await readJson<{ accepted: number; duplicates: number }>(duplicatePriceResponse)).toMatchObject({
      accepted: 0,
      duplicates: 1,
    });

    const weatherResponse = await postWeather(jsonRequest("/api/ingestion/weather", {
      sourceKey: "source-synthetic",
      records: [{
        areaKey: "AREA_001",
        date: "2026-08-01",
        temperatureMinC: 17,
        temperatureMaxC: 29,
        temperatureAvgC: 23,
        rainfallMm: 4,
        relativeHumidityPct: 70,
        solarRadiation: 18,
        windSpeedMps: 1.2,
        dataOrigin: "SYNTHETIC",
      }],
    }, cookie));
    expect(weatherResponse.status).toBe(200);
    expect((await readJson<{ accepted: number }>(weatherResponse)).accepted).toBe(1);

    const yieldResponse = await postYields(jsonRequest("/api/ingestion/yields", {
      sourceKey: "source-synthetic",
      records: [{
        areaKey: "AREA_001",
        cropKey: "HEAD_LETTUCE",
        harvestDate: "2026-02-15",
        yieldKgPerRai: 725,
        dataOrigin: "ACTUAL",
      }],
    }, cookie));
    expect(yieldResponse.status).toBe(200);
    expect((await readJson<{ accepted: number }>(yieldResponse)).accepted).toBe(1);

    const managedUser = await authRepository.register({
      fullName: "Managed Integration User",
      email: `managed-${suffix}@example.com`,
      password: "password123",
    });
    const deactivateResponse = await patchUserStatus(
      jsonRequest(`/api/users/${managedUser.user.id}`, { active: false }, cookie),
      { params: { id: managedUser.user.id } },
    );
    expect(deactivateResponse.status).toBe(200);
    expect((await readJson<{ user: { active: boolean } }>(deactivateResponse)).user.active).toBe(false);

    const maintenanceResponse = await patchSystemStatus(
      jsonRequest("/api/admin/system-status", { mode: "MAINTENANCE", message: "integration test" }, cookie),
    );
    if (!maintenanceResponse) throw new Error("system status route returned no response");
    expect(maintenanceResponse.status).toBe(200);
    expect((await readJson<{ status: { mode: string } }>(maintenanceResponse)).status.mode).toBe("MAINTENANCE");

    const reactivateResponse = await patchUserStatus(
      jsonRequest(`/api/users/${managedUser.user.id}`, { active: true }, cookie),
      { params: { id: managedUser.user.id } },
    );
    expect(reactivateResponse.status).toBe(200);
    expect((await readJson<{ user: { active: boolean } }>(reactivateResponse)).user.active).toBe(true);

    const blockedResponse = await postCultivation(jsonRequest("/api/cultivations", {
      areaKey: "AREA_001",
      cropKey: "HEAD_LETTUCE",
      plantingDate: "2026-09-04",
      areaRai: 1,
      costsPerRai: { fertilizerThb: 0, chemicalThb: 0, laborThb: 0, otherThb: 0 },
    }, cookie));
    expect(blockedResponse.status).toBe(503);

    const restoreResponse = await patchSystemStatus(
      jsonRequest("/api/admin/system-status", { mode: "NORMAL" }, cookie),
    );
    if (!restoreResponse) throw new Error("system status route returned no response");
    expect(restoreResponse.status).toBe(200);
    const finalStatusResponse = await getSystemStatus(new Request("http://localhost/api/admin/system-status", { headers: { cookie } }));
    if (!finalStatusResponse) throw new Error("system status route returned no response");
    expect((await readJson<{ status: { mode: string } }>(finalStatusResponse)).status.mode).toBe("NORMAL");
  });
});
