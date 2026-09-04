import { describe, expect, it } from "vitest";

import { SYNTHETIC_PRICE_OBSERVATIONS } from "@/lib/data/syntheticSeed";
import {
  comparePriceForecasts,
  evaluatePriceForecast,
} from "@/lib/ml/priceEvaluation";

describe("price forecast evaluation", () => {
  it("compares a forecast with a same-series naive baseline", () => {
    const result = comparePriceForecasts([
      { actualPrice: 10, forecastPrice: 11, naivePrice: 14 },
      { actualPrice: 12, forecastPrice: 11, naivePrice: 16 },
      { actualPrice: 14, forecastPrice: 13, naivePrice: 18 },
    ]);

    expect(result.sampleCount).toBe(3);
    expect(result.forecast.MAE).toBe(1);
    expect(result.naive.MAE).toBe(4);
    expect(result.forecastBeatsNaive).toBe(true);
    expect(result.maeImprovementPct).toBe(75);
  });

  it("evaluates only the selected price type from synthetic history", () => {
    const result = evaluatePriceForecast(SYNTHETIC_PRICE_OBSERVATIONS, "WHOLESALE");

    expect(result.sampleCount).toBe(445);
    expect(result.forecast.MAE).toBeGreaterThanOrEqual(0);
    expect(result.naive.MAE).toBeGreaterThanOrEqual(0);
  });
});
