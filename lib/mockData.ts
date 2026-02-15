export const dashboardSummary = {
  yieldPerRaiKg: 750,
  forecastPriceBahtPerKg: 45,
  diseaseRisk: "กลาง" as const,
  expectedRevenueBaht: 85_000,
  totalCostBaht: 45_000,
  profitPerHarvestBaht: 40_000,
  costBreakdown: [
    { label: "ค่าปุ๋ย", value: 16_000 },
    { label: "ค่ายาและสารเคมี", value: 12_000 },
    { label: "ค่าแรงงาน", value: 13_000 },
    { label: "ค่าใช้จ่ายอื่น ๆ", value: 2_000 },
  ],
};

export const monthlyMock = [
  { month: "ม.ค.", price: 40, cost: 42_000, revenue: 78_000 },
  { month: "ก.พ.", price: 41, cost: 43_000, revenue: 80_000 },
  { month: "มี.ค.", price: 42, cost: 44_000, revenue: 81_000 },
  { month: "เม.ย.", price: 43, cost: 45_000, revenue: 83_000 },
  { month: "พ.ค.", price: 44, cost: 45_000, revenue: 84_000 },
  { month: "มิ.ย.", price: 45, cost: 45_000, revenue: 85_000 },
  { month: "ก.ค.", price: 46, cost: 46_000, revenue: 86_500 },
  { month: "ส.ค.", price: 47, cost: 46_500, revenue: 88_000 },
  { month: "ก.ย.", price: 46, cost: 46_000, revenue: 87_000 },
  { month: "ต.ค.", price: 45, cost: 45_500, revenue: 85_500 },
  { month: "พ.ย.", price: 44, cost: 45_000, revenue: 84_000 },
  { month: "ธ.ค.", price: 43, cost: 44_500, revenue: 82_500 },
];

export const mockUser = {
  fullName: "สมชาย ใจดี",
  email: "example@email.com",
};
