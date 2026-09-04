import { describe, expect, it } from "vitest";

import { AREAS, CROP_VARIETIES, CROPS } from "@/lib/domain/catalog";
import {
  SYNTHETIC_FACTOR_OBSERVATIONS,
  SYNTHETIC_PRICE_OBSERVATIONS,
  SYNTHETIC_SEED,
  SYNTHETIC_WEATHER_OBSERVATIONS,
  SYNTHETIC_YIELD_OBSERVATIONS,
} from "@/lib/data/syntheticSeed";

describe("synthetic seed", () => {
  it("contains the required configurable catalog baseline", () => {
    expect(AREAS).toHaveLength(3);
    expect(CROPS).toHaveLength(5);
    expect(CROP_VARIETIES).toHaveLength(5);
    expect(CROP_VARIETIES.every((variety) => variety.dataOrigin === "SYNTHETIC")).toBe(true);
    expect(new Set(AREAS.map((area) => area.dataOrigin))).toEqual(
      new Set(["SYNTHETIC"]),
    );
  });

  it("keeps provenance on generated observations", () => {
    expect(SYNTHETIC_WEATHER_OBSERVATIONS).toHaveLength(90);
    expect(SYNTHETIC_FACTOR_OBSERVATIONS).toHaveLength(39);
    expect(SYNTHETIC_PRICE_OBSERVATIONS).toHaveLength(450);
    expect(SYNTHETIC_YIELD_OBSERVATIONS).toHaveLength(15);
    expect(
      SYNTHETIC_SEED.weather.every((item) => item.dataOrigin === "SYNTHETIC"),
    ).toBe(true);
    expect(
      SYNTHETIC_SEED.prices.every((item) => item.currency === "THB" && item.unit === "kg"),
    ).toBe(true);
    expect(
      SYNTHETIC_SEED.factorObservations.every((item) => item.dataOrigin === "SYNTHETIC"),
    ).toBe(true);
  });
});
