import type { ScalarValue } from "@/lib/domain/types";

export type DatasetFileFormat = "CSV" | "JSON";

export class DatasetFileParseError extends Error {
  constructor(
    message: string,
    public readonly code: "UNSUPPORTED_FORMAT" | "INVALID_FILE",
  ) {
    super(message);
    this.name = "DatasetFileParseError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseCell(value: string): ScalarValue | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.toLowerCase() === "true") return true;
  if (trimmed.toLowerCase() === "false") return false;
  if (/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(trimmed)) {
    const number = Number(trimmed);
    if (Number.isFinite(number)) return number;
  }
  return trimmed;
}

function parseCsv(text: string) {
  const source = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (character === '"' && source[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        cell += character;
      }
      continue;
    }

    if (character === '"' && cell.trim().length === 0) {
      quoted = true;
    } else if (character === ",") {
      row.push(cell);
      cell = "";
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && source[index + 1] === "\n") index += 1;
      row.push(cell);
      cell = "";
      if (row.some((value) => value.trim().length > 0)) rows.push(row);
      row = [];
    } else {
      cell += character;
    }
  }

  if (quoted) {
    throw new DatasetFileParseError("CSV มีเครื่องหมาย quote ไม่ครบ", "INVALID_FILE");
  }
  row.push(cell);
  if (row.some((value) => value.trim().length > 0)) rows.push(row);
  if (rows.length < 2) {
    throw new DatasetFileParseError("CSV ต้องมี header และข้อมูลอย่างน้อย 1 แถว", "INVALID_FILE");
  }

  const headers = rows[0].map((header) => header.trim());
  if (headers.some((header) => !header)) {
    throw new DatasetFileParseError("CSV มีชื่อ column ว่าง", "INVALID_FILE");
  }
  if (new Set(headers).size !== headers.length) {
    throw new DatasetFileParseError("CSV มีชื่อ column ซ้ำกัน", "INVALID_FILE");
  }

  return rows.slice(1).map((values, index) => {
    if (values.length !== headers.length) {
      throw new DatasetFileParseError(
        `CSV แถว ${index + 2} มีจำนวน column ไม่ตรงกับ header`,
        "INVALID_FILE",
      );
    }
    return headers.reduce<Record<string, ScalarValue | undefined>>((record, header, valueIndex) => {
      record[header] = parseCell(values[valueIndex] ?? "");
      return record;
    }, {});
  });
}

export function parseDatasetFile(fileName: string, text: string) {
  const extension = fileName.trim().toLowerCase().split(".").pop();
  if (extension !== "csv" && extension !== "json") {
    throw new DatasetFileParseError("รองรับเฉพาะไฟล์ .csv หรือ .json", "UNSUPPORTED_FORMAT");
  }

  if (extension === "csv") {
    return { format: "CSV" as const, rows: parseCsv(text) };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new DatasetFileParseError("ไฟล์ JSON ไม่ถูกต้อง", "INVALID_FILE");
  }
  if (Array.isArray(parsed)) {
    return { format: "JSON" as const, rows: parsed };
  }
  if (isRecord(parsed) && Array.isArray(parsed.rows)) {
    return { format: "JSON" as const, rows: parsed.rows };
  }
  throw new DatasetFileParseError("ไฟล์ JSON ต้องเป็น array หรือ object ที่มี rows เป็น array", "INVALID_FILE");
}
