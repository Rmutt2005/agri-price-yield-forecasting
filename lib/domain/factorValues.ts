import type { FactorDefinition, ScalarValue } from "@/lib/domain/types";

export class FactorValueError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FactorValueError";
  }
}

function normalizeUnit(unit: string) {
  const normalized = unit.trim().toLowerCase();
  const aliases: Record<string, string> = {
    c: "°C",
    "°c": "°C",
    celsius: "°C",
    f: "°F",
    "°f": "°F",
    fahrenheit: "°F",
    mm: "mm",
    millimeter: "mm",
    millimeters: "mm",
    in: "in",
    inch: "in",
    inches: "in",
    "%": "%",
    "m/s": "m/s",
    mps: "m/s",
    mph: "mph",
  };
  return aliases[normalized] ?? unit.trim();
}

function convertNumber(value: number, fromUnit: string, toUnit: string) {
  if (fromUnit === toUnit) return value;
  if (fromUnit === "°F" && toUnit === "°C") return (value - 32) * (5 / 9);
  if (fromUnit === "°C" && toUnit === "°F") return value * (9 / 5) + 32;
  if (fromUnit === "in" && toUnit === "mm") return value * 25.4;
  if (fromUnit === "mm" && toUnit === "in") return value / 25.4;
  if (fromUnit === "mph" && toUnit === "m/s") return value * 0.44704;
  if (fromUnit === "m/s" && toUnit === "mph") return value / 0.44704;
  throw new FactorValueError(`ไม่รองรับการแปลงหน่วย ${fromUnit} -> ${toUnit}`);
}

export function normalizeFactorValue(
  factor: FactorDefinition,
  value: unknown,
  fromUnit?: string,
): ScalarValue {
  if (factor.dataType === "NUMBER") {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new FactorValueError(`${factor.key} ต้องเป็นตัวเลข finite`);
    }
    if (fromUnit && factor.unit) {
      return Math.round(convertNumber(value, normalizeUnit(fromUnit), normalizeUnit(factor.unit)) * 10_000) / 10_000;
    }
    return value;
  }
  if (factor.dataType === "BOOLEAN" && typeof value !== "boolean") {
    throw new FactorValueError(`${factor.key} ต้องเป็น boolean`);
  }
  if ((factor.dataType === "CATEGORY" || factor.dataType === "TEXT") &&
      (typeof value !== "string" || value.trim().length === 0)) {
    throw new FactorValueError(`${factor.key} ต้องเป็นข้อความที่ไม่ว่าง`);
  }
  return value as ScalarValue;
}
