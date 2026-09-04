import type { CostBreakdownPerRai, EconomicsResult } from "@/lib/domain/types";

const roundMoney = (value: number) => Math.round(value * 100) / 100;

function assertFiniteNonNegative(name: string, value: number) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${name} must be a finite non-negative number`);
  }
}

export function calculateEconomics({
  yieldKgPerRai,
  areaRai,
  priceThbPerKg,
  costsPerRai,
}: {
  yieldKgPerRai: number;
  areaRai: number;
  priceThbPerKg: number;
  costsPerRai: CostBreakdownPerRai;
}): EconomicsResult {
  assertFiniteNonNegative("yieldKgPerRai", yieldKgPerRai);
  if (!Number.isFinite(areaRai) || areaRai <= 0) {
    throw new Error("areaRai must be a finite positive number");
  }
  assertFiniteNonNegative("priceThbPerKg", priceThbPerKg);

  const costValues = Object.values(costsPerRai);
  costValues.forEach((value, index) => {
    assertFiniteNonNegative(`costsPerRai[${index}]`, value);
  });

  const totalExpectedYieldKg = yieldKgPerRai * areaRai;
  const totalCostPerRaiThb = costValues.reduce((sum, value) => sum + value, 0);
  const totalCostThb = totalCostPerRaiThb * areaRai;
  const expectedRevenueThb = totalExpectedYieldKg * priceThbPerKg;
  const expectedProfitThb = expectedRevenueThb - totalCostThb;

  return {
    expectedRevenueThb: roundMoney(expectedRevenueThb),
    totalCostThb: roundMoney(totalCostThb),
    expectedProfitThb: roundMoney(expectedProfitThb),
    breakEvenPriceThbPerKg:
      totalExpectedYieldKg > 0
        ? roundMoney(totalCostThb / totalExpectedYieldKg)
        : 0,
    breakEvenYieldKg:
      priceThbPerKg > 0 ? roundMoney(totalCostThb / priceThbPerKg) : 0,
    profitPerRaiThb: roundMoney(expectedProfitThb / areaRai),
  };
}
