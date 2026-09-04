import { describe, expect, it } from "vitest";

import { BASELINE_FACTORS } from "@/lib/domain/factorRegistry";
import { FactorValueError, normalizeFactorValue } from "@/lib/domain/factorValues";

describe("factor value normalization", () => {
  it("converts supported source units into a factor's canonical unit", () => {
    const temperature = BASELINE_FACTORS.find((factor) => factor.key === "temperature_avg_c")!;
    const rainfall = BASELINE_FACTORS.find((factor) => factor.key === "rainfall_mm")!;

    expect(normalizeFactorValue(temperature, 77, "°F")).toBe(25);
    expect(normalizeFactorValue(rainfall, 1, "inch")).toBe(25.4);
  });

  it("rejects incompatible types and unsupported unit pairs", () => {
    const temperature = BASELINE_FACTORS.find((factor) => factor.key === "temperature_avg_c")!;
    expect(() => normalizeFactorValue(temperature, "25")).toThrowError(FactorValueError);
    expect(() => normalizeFactorValue(temperature, 25, "kg")).toThrow("ไม่รองรับการแปลงหน่วย");
  });
});
