import { isIsoDate } from "@/lib/domain/harvest";
import { catalogRepository } from "@/lib/repositories/catalogRepository";
import { dataSourceRepository } from "@/lib/repositories/dataSourceRepository";
import type {
  DataOrigin,
  PriceObservation,
  PriceType,
  ValidationIssue,
  WeatherObservation,
  YieldObservation,
} from "@/lib/domain/types";

const PRICE_TYPES: readonly PriceType[] = [
  "WHOLESALE",
  "RETAIL",
  "FARM_GATE",
  "OTHER",
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isDataOrigin = (value: unknown): value is DataOrigin =>
  value === "ACTUAL" || value === "IMPUTED" || value === "SYNTHETIC";

function issue(index: number, field: string, message: string): ValidationIssue {
  return { field: `records[${index}].${field}`, message };
}

function finiteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value);
}

async function sourceForKey(sourceKey: unknown) {
  return typeof sourceKey === "string"
    ? await dataSourceRepository.findByKey(sourceKey)
    : undefined;
}

export async function normalizePriceRecords(
  sourceKey: unknown,
  recordsPayload: unknown,
) {
  const issues: ValidationIssue[] = [];
  const [source, crops] = await Promise.all([
    sourceForKey(sourceKey),
    catalogRepository.listCrops(),
  ]);
  const cropKeys = new Set(crops.filter((crop) => crop.active).map((crop) => crop.key));
  if (!source) issues.push({ field: "sourceKey", message: "ไม่พบ data source" });
  if (source && !source.enabled) {
    issues.push({ field: "sourceKey", message: "data source นี้ยังไม่เปิดใช้งาน" });
  }
  if (!Array.isArray(recordsPayload) || recordsPayload.length === 0) {
    issues.push({ field: "records", message: "ต้องมี records อย่างน้อย 1 รายการ" });
    return { source, records: [] as PriceObservation[], issues };
  }

  const records: PriceObservation[] = [];
  recordsPayload.forEach((raw, index) => {
    if (!isRecord(raw)) {
      issues.push(issue(index, "record", "ต้องเป็น object"));
      return;
    }
    const cropKey = raw.cropKey;
    const date = raw.date;
    const price = raw.price;
    const priceType = raw.priceType;
    const currency = raw.currency ?? "THB";
    const unit = raw.unit ?? "kg";
    if (typeof cropKey !== "string" || !cropKeys.has(cropKey)) {
      issues.push(issue(index, "cropKey", "ไม่พบ crop ใน catalog"));
    }
    if (typeof date !== "string" || !isIsoDate(date)) {
      issues.push(issue(index, "date", "ต้องเป็นวันที่ YYYY-MM-DD ที่ถูกต้อง"));
    }
    if (!finiteNumber(price) || (price as number) < 0) {
      issues.push(issue(index, "price", "ต้องเป็นตัวเลขที่ไม่ติดลบ"));
    }
    if (!PRICE_TYPES.includes(priceType as PriceType)) {
      issues.push(issue(index, "priceType", "price type ไม่ถูกต้อง"));
    }
    if (currency !== "THB") issues.push(issue(index, "currency", "ต้องเป็น THB"));
    if (unit !== "kg") issues.push(issue(index, "unit", "ต้องเป็น kg"));
    if (raw.dataOrigin !== undefined && !isDataOrigin(raw.dataOrigin)) {
      issues.push(issue(index, "dataOrigin", "ต้องเป็น ACTUAL, IMPUTED หรือ SYNTHETIC"));
    }
    const dataOrigin = isDataOrigin(raw.dataOrigin) ? raw.dataOrigin : "ACTUAL";
    if (source?.enabled && cropKeys.has(cropKey as string) &&
        typeof date === "string" && isIsoDate(date) && finiteNumber(price) &&
        (price as number) >= 0 && PRICE_TYPES.includes(priceType as PriceType) &&
        currency === "THB" && unit === "kg" &&
        (raw.dataOrigin === undefined || isDataOrigin(raw.dataOrigin))) {
      records.push({
        id: `price-${source.id}-${cropKey}-${date}-${index}`,
        cropKey: cropKey as string,
        date,
        price: price as number,
        currency: "THB",
        unit: "kg",
        priceType: priceType as PriceType,
        market: typeof raw.market === "string" ? raw.market : undefined,
        sourceId: source.id,
        dataOrigin,
      });
    }
  });

  return { source, records, issues };
}

export async function normalizeWeatherRecords(
  sourceKey: unknown,
  recordsPayload: unknown,
) {
  const issues: ValidationIssue[] = [];
  const [source, areas] = await Promise.all([
    sourceForKey(sourceKey),
    catalogRepository.listAreas(),
  ]);
  const areaKeys = new Set(areas.filter((area) => area.active).map((area) => area.key));
  if (!source) issues.push({ field: "sourceKey", message: "ไม่พบ data source" });
  if (source && !source.enabled) {
    issues.push({ field: "sourceKey", message: "data source นี้ยังไม่เปิดใช้งาน" });
  }
  if (!Array.isArray(recordsPayload) || recordsPayload.length === 0) {
    issues.push({ field: "records", message: "ต้องมี records อย่างน้อย 1 รายการ" });
    return { source, records: [] as WeatherObservation[], issues };
  }

  const records: WeatherObservation[] = [];
  recordsPayload.forEach((raw, index) => {
    if (!isRecord(raw)) {
      issues.push(issue(index, "record", "ต้องเป็น object"));
      return;
    }
    const areaKey = raw.areaKey;
    const date = raw.date;
    const numericFields = [
      "temperatureMinC",
      "temperatureMaxC",
      "temperatureAvgC",
      "rainfallMm",
      "relativeHumidityPct",
      "solarRadiation",
      "windSpeedMps",
    ] as const;
    if (typeof areaKey !== "string" || !areaKeys.has(areaKey)) {
      issues.push(issue(index, "areaKey", "ไม่พบ area ใน catalog"));
    }
    if (typeof date !== "string" || !isIsoDate(date)) {
      issues.push(issue(index, "date", "ต้องเป็นวันที่ YYYY-MM-DD ที่ถูกต้อง"));
    }
    numericFields.forEach((field) => {
      const value = raw[field];
      if (!finiteNumber(value)) {
        issues.push(issue(index, field, "ต้องเป็นตัวเลข"));
      }
    });
    if (finiteNumber(raw.relativeHumidityPct) &&
        ((raw.relativeHumidityPct as number) < 0 || (raw.relativeHumidityPct as number) > 100)) {
      issues.push(issue(index, "relativeHumidityPct", "ต้องอยู่ระหว่าง 0 ถึง 100"));
    }
    if (finiteNumber(raw.rainfallMm) && (raw.rainfallMm as number) < 0) {
      issues.push(issue(index, "rainfallMm", "ต้องไม่ติดลบ"));
    }
    if (raw.dataOrigin !== undefined && !isDataOrigin(raw.dataOrigin)) {
      issues.push(issue(index, "dataOrigin", "ต้องเป็น ACTUAL, IMPUTED หรือ SYNTHETIC"));
    }
    if (source?.enabled && areaKeys.has(areaKey as string) &&
        typeof date === "string" && isIsoDate(date) &&
        numericFields.every((field) => finiteNumber(raw[field])) &&
        (raw.dataOrigin === undefined || isDataOrigin(raw.dataOrigin))) {
      const base = {
        temperatureMinC: raw.temperatureMinC,
        temperatureMaxC: raw.temperatureMaxC,
        temperatureAvgC: raw.temperatureAvgC,
        rainfallMm: raw.rainfallMm,
        relativeHumidityPct: raw.relativeHumidityPct,
        solarRadiation: raw.solarRadiation,
        windSpeedMps: raw.windSpeedMps,
      };
      records.push({
        id: `weather-${source.id}-${areaKey}-${date}-${index}`,
        areaKey: areaKey as string,
        date,
        temperatureMinC: Number(base.temperatureMinC ?? 0),
        temperatureMaxC: Number(base.temperatureMaxC ?? 0),
        temperatureAvgC: Number(base.temperatureAvgC ?? 0),
        rainfallMm: Number(base.rainfallMm ?? 0),
        relativeHumidityPct: Number(base.relativeHumidityPct ?? 0),
        solarRadiation: Number(base.solarRadiation ?? 0),
        windSpeedMps: Number(base.windSpeedMps ?? 0),
        sourceId: source.id,
        dataOrigin: isDataOrigin(raw.dataOrigin) ? raw.dataOrigin : "ACTUAL",
      });
    }
  });

  return { source, records, issues };
}

export async function normalizeYieldRecords(
  sourceKey: unknown,
  recordsPayload: unknown,
) {
  const issues: ValidationIssue[] = [];
  const [source, areas, crops] = await Promise.all([
    sourceForKey(sourceKey),
    catalogRepository.listAreas(),
    catalogRepository.listCrops(),
  ]);
  const areaKeys = new Set(areas.filter((area) => area.active).map((area) => area.key));
  const cropKeys = new Set(crops.filter((crop) => crop.active).map((crop) => crop.key));
  if (!source) issues.push({ field: "sourceKey", message: "ไม่พบ data source" });
  if (source && !source.enabled) {
    issues.push({ field: "sourceKey", message: "data source นี้ยังไม่เปิดใช้งาน" });
  }
  if (!Array.isArray(recordsPayload) || recordsPayload.length === 0) {
    issues.push({ field: "records", message: "ต้องมี records อย่างน้อย 1 รายการ" });
    return { source, records: [] as YieldObservation[], issues };
  }

  const records: YieldObservation[] = [];
  recordsPayload.forEach((raw, index) => {
    if (!isRecord(raw)) {
      issues.push(issue(index, "record", "ต้องเป็น object"));
      return;
    }
    const areaKey = raw.areaKey;
    const cropKey = raw.cropKey;
    const harvestDate = raw.harvestDate;
    const yieldKgPerRai = raw.yieldKgPerRai;
    if (typeof areaKey !== "string" || !areaKeys.has(areaKey)) {
      issues.push(issue(index, "areaKey", "ไม่พบ area ใน catalog"));
    }
    if (typeof cropKey !== "string" || !cropKeys.has(cropKey)) {
      issues.push(issue(index, "cropKey", "ไม่พบ crop ใน catalog"));
    }
    if (typeof harvestDate !== "string" || !isIsoDate(harvestDate)) {
      issues.push(issue(index, "harvestDate", "ต้องเป็นวันที่ YYYY-MM-DD ที่ถูกต้อง"));
    }
    if (!finiteNumber(yieldKgPerRai) || (yieldKgPerRai as number) < 0) {
      issues.push(issue(index, "yieldKgPerRai", "ต้องเป็นตัวเลขที่ไม่ติดลบ"));
    }
    if (raw.dataOrigin !== undefined && !isDataOrigin(raw.dataOrigin)) {
      issues.push(issue(index, "dataOrigin", "ต้องเป็น ACTUAL, IMPUTED หรือ SYNTHETIC"));
    }
    const dataOrigin = isDataOrigin(raw.dataOrigin) ? raw.dataOrigin : "ACTUAL";
    if (source?.enabled && areaKeys.has(areaKey as string) && cropKeys.has(cropKey as string) &&
        typeof harvestDate === "string" && isIsoDate(harvestDate) &&
        finiteNumber(yieldKgPerRai) && (yieldKgPerRai as number) >= 0 &&
        (raw.dataOrigin === undefined || isDataOrigin(raw.dataOrigin))) {
      records.push({
        id: `yield-${source.id}-${areaKey}-${cropKey}-${harvestDate}-${index}`,
        areaKey: areaKey as string,
        cropKey: cropKey as string,
        harvestDate,
        yieldKgPerRai: yieldKgPerRai as number,
        sourceId: source.id,
        dataOrigin,
      });
    }
  });

  return { source, records, issues };
}
