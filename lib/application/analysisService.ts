import { calculateEconomics } from "@/lib/domain/economics";
import { calculateExpectedHarvestDate, isIsoDate } from "@/lib/domain/harvest";
import { calculateDiseaseRisk } from "@/lib/domain/risk";
import type {
  AnalysisInput,
  AnalysisResponse,
  CostBreakdownPerRai,
  ScalarValue,
  ValidationIssue,
} from "@/lib/domain/types";
import {
  forecastPriceThbPerKg,
  PRICE_TARGET_TYPE,
  predictYieldWithModel,
} from "@/lib/ml/baseline";
import { catalogRepository } from "@/lib/repositories/catalogRepository";
import { weatherRepository as defaultWeatherRepository } from "@/lib/repositories/weatherRepository";
import type { WeatherRepository } from "@/lib/repositories/weatherRepository";
import { modelRepository as defaultModelRepository } from "@/lib/repositories/modelRepository";
import type { ModelRepository } from "@/lib/repositories/modelRepository";

const COST_KEYS: Array<keyof CostBreakdownPerRai> = [
  "fertilizerThb",
  "chemicalThb",
  "laborThb",
  "otherThb",
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isScalar = (value: unknown): value is ScalarValue =>
  typeof value === "number" || typeof value === "string" || typeof value === "boolean";

function readNonNegativeNumber(
  object: Record<string, unknown>,
  key: string,
  issues: ValidationIssue[],
  defaultValue = 0,
) {
  const value = object[key] ?? defaultValue;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    issues.push({
      field: key,
      message: "ต้องเป็นตัวเลขที่ไม่ติดลบ",
    });
    return defaultValue;
  }
  return value;
}

export async function validateAnalysisInput(
  payload: unknown,
): Promise<{ input: AnalysisInput } | { issues: ValidationIssue[] }> {
  const issues: ValidationIssue[] = [];
  if (!isRecord(payload)) {
    return { issues: [{ field: "body", message: "request body ต้องเป็น object" }] };
  }

  const areaKey = payload.areaKey;
  const cropKey = payload.cropKey;
  const varietyKey = payload.varietyKey;
  const plantingDate = payload.plantingDate;

  const [area, crop] = await Promise.all([
    typeof areaKey === "string" ? catalogRepository.findArea(areaKey) : undefined,
    typeof cropKey === "string" ? catalogRepository.findCrop(cropKey) : undefined,
  ]);
  if (typeof areaKey !== "string" || !area) {
    issues.push({ field: "areaKey", message: "ไม่พบพื้นที่ที่เลือก" });
  }
  if (typeof cropKey !== "string" || !crop) {
    issues.push({ field: "cropKey", message: "ไม่พบพืชที่เลือก" });
  }
  if (varietyKey !== undefined) {
    const variety = typeof varietyKey === "string"
      ? await catalogRepository.findVariety(varietyKey, typeof cropKey === "string" ? cropKey : undefined)
      : undefined;
    if (!variety) {
      issues.push({ field: "varietyKey", message: "ไม่พบสายพันธุ์ของพืชที่เลือก" });
    }
  }
  if (typeof plantingDate !== "string" || !isIsoDate(plantingDate)) {
    issues.push({
      field: "plantingDate",
      message: "ต้องเป็นวันที่รูปแบบ YYYY-MM-DD ที่ถูกต้อง",
    });
  }

  const areaRai = payload.areaRai;
  if (typeof areaRai !== "number" || !Number.isFinite(areaRai) || areaRai <= 0) {
    issues.push({ field: "areaRai", message: "ต้องเป็นตัวเลขที่มากกว่า 0" });
  }

  const growingDaysOverride = payload.growingDaysOverride;
  if (
    growingDaysOverride !== undefined &&
    (typeof growingDaysOverride !== "number" ||
      !Number.isInteger(growingDaysOverride) ||
      growingDaysOverride <= 0 ||
      growingDaysOverride > 730)
  ) {
    issues.push({
      field: "growingDaysOverride",
      message: "ต้องเป็นจำนวนวันเต็มระหว่าง 1 ถึง 730",
    });
  }

  const costsPayload = payload.costsPerRai;
  if (costsPayload !== undefined && !isRecord(costsPayload)) {
    issues.push({ field: "costsPerRai", message: "ต้องเป็น object" });
  }
  const costObject = isRecord(costsPayload) ? costsPayload : {};
  const costsPerRai = COST_KEYS.reduce((costs, key) => {
    costs[key] = readNonNegativeNumber(costObject, key, issues);
    return costs;
  }, {} as CostBreakdownPerRai);

  const factorsPayload = payload.factors;
  if (factorsPayload !== undefined && !isRecord(factorsPayload)) {
    issues.push({ field: "factors", message: "ต้องเป็น object" });
  }
  const factors: Record<string, ScalarValue> = {};
  if (isRecord(factorsPayload)) {
    for (const [key, value] of Object.entries(factorsPayload)) {
      if (!(await catalogRepository.findFactor(key))) {
        issues.push({ field: `factors.${key}`, message: "ไม่พบ factor ใน registry" });
      } else if (!isScalar(value)) {
        issues.push({
          field: `factors.${key}`,
          message: "ต้องเป็น number, string หรือ boolean",
        });
      } else {
        factors[key] = value;
      }
    }
  }

  if (issues.length > 0) return { issues };

  return {
    input: {
      areaKey: areaKey as string,
      cropKey: cropKey as string,
      varietyKey: typeof varietyKey === "string" ? varietyKey : undefined,
      plantingDate: plantingDate as string,
      areaRai: areaRai as number,
      growingDaysOverride: growingDaysOverride as number | undefined,
      factors,
      costsPerRai,
    },
  };
}

export async function analyzeCultivation(
  input: AnalysisInput,
  repositories: { models?: ModelRepository; weather?: WeatherRepository } = {},
): Promise<AnalysisResponse> {
  const [area, crop] = await Promise.all([
    catalogRepository.findArea(input.areaKey),
    catalogRepository.findCrop(input.cropKey),
  ]);
  if (!area || !crop) throw new Error("Analysis input references an unknown area or crop");
  const variety = input.varietyKey
    ? await catalogRepository.findVariety(input.varietyKey, crop.key)
    : undefined;
  if (input.varietyKey && !variety) throw new Error("Analysis input references an unknown crop variety");

  const models = repositories.models ?? defaultModelRepository;
  const weatherRepository = repositories.weather ?? defaultWeatherRepository;
  const [yieldModel, priceModel, diseaseModel] = await Promise.all([
    models.getActive("YIELD"),
    models.getActive("PRICE"),
    models.getActive("DISEASE"),
  ]);

  const growingDays = input.growingDaysOverride ?? variety?.growingDaysOverride ?? crop.defaultGrowingDays;
  const expectedHarvestDate = calculateExpectedHarvestDate(
    input.plantingDate,
    growingDays,
  );
  const [summaryWeather, rawWeather] = await Promise.all([
    weatherRepository.getSummary(area.key),
    weatherRepository.getFeatures(area.key, {
      startDate: input.plantingDate,
      endDate: expectedHarvestDate,
    }),
  ]);
  const hasRawWeather = rawWeather.observedDays > 0;
  const weather = hasRawWeather
    ? {
        ...summaryWeather,
        temperatureMinC: rawWeather.minimumTemperatureC ?? summaryWeather.temperatureMinC,
        temperatureMaxC: rawWeather.maximumTemperatureC ?? summaryWeather.temperatureMaxC,
        temperatureAvgC: rawWeather.averageTemperatureC ?? summaryWeather.temperatureAvgC,
        rainfallMm: rawWeather.totalRainfallMm !== undefined
          ? rawWeather.totalRainfallMm / Math.max(1, rawWeather.observedDays)
          : summaryWeather.rainfallMm,
        relativeHumidityPct: rawWeather.averageRelativeHumidityPct ?? summaryWeather.relativeHumidityPct,
        dataOrigin: rawWeather.dataOrigin ?? summaryWeather.dataOrigin,
      }
    : summaryWeather;
  const yieldKgPerRai = predictYieldWithModel(yieldModel, {
    crop,
    area,
    weather,
    growingDays,
  });
  const priceThbPerKg = forecastPriceThbPerKg({ crop, harvestDate: expectedHarvestDate });
  const diseaseRisk = calculateDiseaseRisk({
    temperatureAvgC:
      typeof input.factors?.temperature_avg_c === "number"
        ? input.factors.temperature_avg_c
        : weather.temperatureAvgC,
    relativeHumidityPct:
      typeof input.factors?.relative_humidity_pct === "number"
        ? input.factors.relative_humidity_pct
        : weather.relativeHumidityPct,
    rainfallMm:
      typeof input.factors?.rainfall_mm === "number"
        ? input.factors.rainfall_mm
        : weather.rainfallMm,
    soilMoisturePct:
      typeof input.factors?.soil_moisture_pct === "number"
        ? input.factors.soil_moisture_pct
        : undefined,
  });
  const economics = calculateEconomics({
    yieldKgPerRai,
    areaRai: input.areaRai,
    priceThbPerKg,
    costsPerRai: input.costsPerRai,
  });
  const predictionTimestamp = new Date().toISOString();
  const weatherWarnings = hasRawWeather
    ? [
        `aggregate raw weather ${rawWeather.observedDays}/${rawWeather.expectedDays} วัน`,
        ...(rawWeather.missingDays > 0
          ? [`raw weather ขาด ${rawWeather.missingDays} วันในช่วงเพาะปลูก`]
          : []),
        ...(rawWeather.dataOrigin === undefined ? ["raw weather มี provenance มากกว่าหนึ่งประเภท"] : []),
      ]
    : [
        "ไม่มี raw weather ครอบคลุมช่วงเพาะปลูก จึงใช้ weather summary สำหรับ development",
      ];

  return {
    analysisId: `analysis-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    expectedHarvestDate,
    yield: {
      kgPerRai: yieldKgPerRai,
      totalKg: Math.round(yieldKgPerRai * input.areaRai * 100) / 100,
      unit: "kg/rai",
      modelVersion: yieldModel.version,
    },
    price: {
      thbPerKg: priceThbPerKg,
      currency: "THB",
      unit: "kg",
      priceType: PRICE_TARGET_TYPE,
      modelVersion: priceModel.version,
    },
    diseaseRisk: {
      score: diseaseRisk.score,
      level: diseaseRisk.level,
      ruleVersion: diseaseModel.version,
    },
    economics,
    inputFeatureSchema: [...yieldModel.featureSchema],
    dataQuality: {
      origin: weather.dataOrigin,
      stale: !hasRawWeather || rawWeather.missingDays > 0,
      warnings: [
        ...weatherWarnings,
        ...(weather.dataOrigin === "SYNTHETIC" ? ["ใช้ข้อมูลสภาพอากาศสังเคราะห์สำหรับ development"] : []),
        "ใช้ baseline model/risk rules; ยังไม่มีข้อมูลจริงจากโครงการหลวง",
      ],
    },
    predictionTimestamp,
  };
}
