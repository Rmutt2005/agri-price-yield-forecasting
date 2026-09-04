import { describe, expect, it } from "vitest";

import { calculateEconomics } from "@/lib/domain/economics";

describe("calculateEconomics", () => {
  it("calculates total yield, revenue, cost, profit and break-even values", () => {
    const result = calculateEconomics({
      yieldKgPerRai: 100,
      areaRai: 2,
      priceThbPerKg: 10,
      costsPerRai: {
        fertilizerThb: 2,
        chemicalThb: 3,
        laborThb: 4,
        otherThb: 1,
      },
    });

    expect(result).toEqual({
      expectedRevenueThb: 2_000,
      totalCostThb: 20,
      expectedProfitThb: 1_980,
      breakEvenPriceThbPerKg: 0.1,
      breakEvenYieldKg: 2,
      profitPerRaiThb: 990,
    });
  });

  it("rejects a non-positive area", () => {
    expect(() =>
      calculateEconomics({
        yieldKgPerRai: 100,
        areaRai: 0,
        priceThbPerKg: 10,
        costsPerRai: {
          fertilizerThb: 0,
          chemicalThb: 0,
          laborThb: 0,
          otherThb: 0,
        },
      }),
    ).toThrow("areaRai must be a finite positive number");
  });
});
