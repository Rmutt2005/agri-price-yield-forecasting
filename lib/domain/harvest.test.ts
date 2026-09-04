import { describe, expect, it } from "vitest";

import {
  calculateExpectedHarvestDate,
  isIsoDate,
} from "@/lib/domain/harvest";

describe("harvest date", () => {
  it("adds growing days without timezone drift", () => {
    expect(calculateExpectedHarvestDate("2026-01-30", 5)).toBe("2026-02-04");
  });

  it("rejects invalid calendar dates", () => {
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(() => calculateExpectedHarvestDate("2026-02-30", 10)).toThrow();
  });
});
