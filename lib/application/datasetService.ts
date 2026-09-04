import { isIsoDate } from "@/lib/domain/harvest";
import { FactorValueError, normalizeFactorValue } from "@/lib/domain/factorValues";
import type {
  DataOrigin,
  DatasetValidationIssue,
  DatasetValidationReport,
  ScalarValue,
} from "@/lib/domain/types";
import { catalogRepository } from "@/lib/repositories/catalogRepository";

export const MAX_DATASET_ROWS = 10_000;
export const MAX_DATASET_NAME_LENGTH = 120;

const REQUIRED_COLUMNS = ["areaKey", "cropKey", "yieldKgPerRai"] as const;
const RESERVED_COLUMNS = new Set([
  "areaKey",
  "cropKey",
  "varietyKey",
  "plantingDate",
  "yieldKgPerRai",
  "dataOrigin",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isDataOrigin = (value: unknown): value is DataOrigin =>
  value === "ACTUAL" || value === "IMPUTED" || value === "SYNTHETIC";

const isScalar = (value: unknown): value is ScalarValue =>
  typeof value === "number" || typeof value === "string" || typeof value === "boolean";

function mapRow(
  raw: Record<string, unknown>,
  columnMapping: Record<string, string>,
) {
  const mapped: Record<string, unknown> = {};
  Object.entries(raw).forEach(([sourceColumn, value]) => {
    const targetColumn = columnMapping[sourceColumn] ?? sourceColumn;
    mapped[targetColumn] = value;
  });
  return mapped;
}

function addIssue(
  issues: DatasetValidationIssue[],
  row: number,
  field: string,
  message: string,
) {
  issues.push({ row, field, message });
}

export async function validateDatasetRows({
  rows: rowsPayload,
  columnMapping: columnMappingPayload,
  dataOrigin: datasetOrigin = "SYNTHETIC",
}: {
  rows: unknown;
  columnMapping?: unknown;
  dataOrigin?: unknown;
}): Promise<{
  rows: Array<Record<string, ScalarValue>>;
  report: DatasetValidationReport;
}> {
  const issues: DatasetValidationIssue[] = [];
  if (!Array.isArray(rowsPayload)) {
    return {
      rows: [] as Array<Record<string, ScalarValue>>,
      report: {
        valid: false,
        rowCount: 0,
        validRowCount: 0,
        invalidRowCount: 0,
        detectedColumns: [],
        featureColumns: [],
        provenanceCounts: { ACTUAL: 0, IMPUTED: 0, SYNTHETIC: 0 },
        issues: [{ row: 0, field: "rows", message: "ต้องเป็น array" }],
      } satisfies DatasetValidationReport,
    };
  }
  if (rowsPayload.length === 0) {
    addIssue(issues, 0, "rows", "ต้องมีข้อมูลอย่างน้อย 1 แถว");
  }
  if (rowsPayload.length > MAX_DATASET_ROWS) {
    addIssue(issues, 0, "rows", `รองรับได้ไม่เกิน ${MAX_DATASET_ROWS.toLocaleString()} แถว`);
  }

  const columnMapping: Record<string, string> = {};
  if (columnMappingPayload !== undefined) {
    if (!isRecord(columnMappingPayload)) {
      addIssue(issues, 0, "columnMapping", "ต้องเป็น object");
    } else {
      Object.entries(columnMappingPayload).forEach(([source, target]) => {
        if (typeof target !== "string" || !target.trim()) {
          addIssue(issues, 0, `columnMapping.${source}`, "ปลายทางต้องเป็นชื่อ column");
        } else {
          const normalizedTarget = target.trim();
          if (Object.values(columnMapping).includes(normalizedTarget)) {
            addIssue(issues, 0, `columnMapping.${source}`, "ห้าม map หลาย column ไปปลายทางเดียวกัน");
          } else {
            columnMapping[source] = normalizedTarget;
          }
        }
      });
    }
  }

  const mappedRows = rowsPayload.map((row) =>
    isRecord(row) ? mapRow(row, columnMapping) : null,
  );
  const [areas, crops, factors] = await Promise.all([
    catalogRepository.listAreas(),
    catalogRepository.listCrops(),
    catalogRepository.listFactors(),
  ]);
  const areaKeys = new Set(areas.filter((area) => area.active).map((area) => area.key));
  const cropKeys = new Set(crops.filter((crop) => crop.active).map((crop) => crop.key));
  const factorsByKey = new Map(
    factors.filter((factor) => factor.active).map((factor) => [factor.key, factor]),
  );
  const detectedColumns = [
    ...new Set(
      mappedRows.flatMap((row) => (row ? Object.keys(row) : [])),
    ),
  ];
  const featureColumns = detectedColumns.filter(
    (column) => !RESERVED_COLUMNS.has(column) && factorsByKey.has(column),
  );
  detectedColumns
    .filter((column) => !RESERVED_COLUMNS.has(column) && !factorsByKey.has(column))
    .forEach((column) => addIssue(issues, 0, `columns.${column}`, "ไม่พบ factor นี้ใน registry หรือไม่ได้ map column"));
  const provenanceCounts: Record<DataOrigin, number> = {
    ACTUAL: 0,
    IMPUTED: 0,
    SYNTHETIC: 0,
  };
  const validRows: Array<Record<string, ScalarValue>> = [];
  const duplicateKeys = new Set<string>();

  if (!isDataOrigin(datasetOrigin)) {
    addIssue(issues, 0, "dataOrigin", "ต้องเป็น ACTUAL, IMPUTED หรือ SYNTHETIC");
  }

  mappedRows.forEach((row, index) => {
    const rowNumber = index + 1;
    if (!row) {
      addIssue(issues, rowNumber, "row", "ต้องเป็น object");
      return;
    }
    let rowValid = true;
    Object.entries(row).forEach(([field, value]) => {
      if (value !== undefined && !isScalar(value)) {
        addIssue(issues, rowNumber, field, "ต้องเป็นค่า scalar เท่านั้น");
        rowValid = false;
      }
    });
    REQUIRED_COLUMNS.forEach((column) => {
      if (!(column in row) || row[column] === "" || row[column] === null || row[column] === undefined) {
        addIssue(issues, rowNumber, column, "ห้ามว่าง");
        rowValid = false;
      }
    });

    const areaKey = row.areaKey;
    const cropKey = row.cropKey;
    const target = row.yieldKgPerRai;
    if (typeof areaKey !== "string" || !areaKeys.has(areaKey)) {
      addIssue(issues, rowNumber, "areaKey", "ไม่พบ area ใน catalog");
      rowValid = false;
    }
    if (typeof cropKey !== "string" || !cropKeys.has(cropKey)) {
      addIssue(issues, rowNumber, "cropKey", "ไม่พบ crop ใน catalog");
      rowValid = false;
    }
    if (typeof target !== "number" || !Number.isFinite(target) || target < 0) {
      addIssue(issues, rowNumber, "yieldKgPerRai", "ต้องเป็นตัวเลขที่ไม่ติดลบ");
      rowValid = false;
    }
    if (row.plantingDate !== undefined &&
        (typeof row.plantingDate !== "string" || !isIsoDate(row.plantingDate))) {
      addIssue(issues, rowNumber, "plantingDate", "ต้องเป็นวันที่ YYYY-MM-DD ที่ถูกต้อง");
      rowValid = false;
    }
    if (row.dataOrigin !== undefined && !isDataOrigin(row.dataOrigin)) {
      addIssue(issues, rowNumber, "dataOrigin", "ต้องเป็น ACTUAL, IMPUTED หรือ SYNTHETIC");
      rowValid = false;
    }

    const rowOrigin = isDataOrigin(row.dataOrigin)
      ? row.dataOrigin
      : (isDataOrigin(datasetOrigin) ? datasetOrigin : "SYNTHETIC");
    provenanceCounts[rowOrigin] += 1;
    if (typeof areaKey === "string" && typeof cropKey === "string") {
      const duplicateKey = `${areaKey}|${cropKey}|${String(row.plantingDate ?? "")}`;
      if (duplicateKeys.has(duplicateKey)) {
        addIssue(issues, rowNumber, "row", "พบข้อมูลซ้ำตาม area/crop/plantingDate");
        rowValid = false;
      }
      duplicateKeys.add(duplicateKey);
    }

    featureColumns.forEach((column) => {
      const factor = factorsByKey.get(column);
      const value = row[column];
      if (!factor || value === undefined) return;
      try {
        row[column] = normalizeFactorValue(factor, value);
      } catch (error) {
        addIssue(
          issues,
          rowNumber,
          column,
          error instanceof FactorValueError ? error.message : "factor value ไม่ถูกต้อง",
        );
        rowValid = false;
      }
    });

    if (rowValid) {
      const scalarRow: Record<string, ScalarValue> = {};
      Object.entries({ ...row, dataOrigin: rowOrigin }).forEach(([key, value]) => {
        if (isScalar(value)) scalarRow[key] = value;
      });
      validRows.push(scalarRow);
    }
  });

  const report: DatasetValidationReport = {
    valid: issues.length === 0 && validRows.length === rowsPayload.length,
    rowCount: rowsPayload.length,
    validRowCount: validRows.length,
    invalidRowCount: rowsPayload.length - validRows.length,
    detectedColumns,
    featureColumns,
    provenanceCounts,
    issues,
  };
  return { rows: validRows, report };
}
