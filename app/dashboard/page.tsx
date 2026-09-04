"use client";

import * as React from "react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CircleDollarSign,
  Bug,
  CalendarDays,
  Leaf,
  LineChart as LineChartIcon,
  PiggyBank,
  Sprout,
  TrendingUp,
} from "lucide-react";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card } from "@/components/ui/Card";
import { ChartCard } from "@/components/ui/ChartCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { dashboardSummary, monthlyMock } from "@/lib/mockData";
import type { AnalysisResponse, RiskLevel } from "@/lib/domain/types";
import type { DashboardChartData } from "@/lib/application/dashboardService";

function formatNumber(n: number) {
  return new Intl.NumberFormat("th-TH").format(n);
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00.000Z`));
}

const riskLabels: Record<RiskLevel, string> = {
  VERY_LOW: "ต่ำมาก",
  LOW: "ต่ำ",
  MEDIUM: "กลาง",
  HIGH: "สูง",
  VERY_HIGH: "สูงมาก",
};

function RiskPill({ risk }: { risk: RiskLevel }) {
  const styles: Record<RiskLevel, { bg: string; text: string; ring: string }> = {
    VERY_LOW: {
      bg: "bg-white/35 dark:bg-white/10",
      text: "text-moss-600 dark:text-moss-400",
      ring: "ring-white/30 dark:ring-white/10",
    },
    LOW: {
      bg: "bg-white/35 dark:bg-white/10",
      text: "text-moss-600 dark:text-moss-400",
      ring: "ring-white/30 dark:ring-white/10",
    },
    MEDIUM: {
      bg: "bg-sun-300/25 dark:bg-sun-400/10",
      text: "text-amber-800 dark:text-amber-200",
      ring: "ring-white/30 dark:ring-white/10",
    },
    HIGH: {
      bg: "bg-rose-100/35 dark:bg-rose-950/30",
      text: "text-rose-700 dark:text-rose-200",
      ring: "ring-rose-300/30 dark:ring-rose-200/10",
    },
    VERY_HIGH: {
      bg: "bg-rose-200/50 dark:bg-rose-950/50",
      text: "text-rose-800 dark:text-rose-100",
      ring: "ring-rose-400/40 dark:ring-rose-100/20",
    },
  };
  const style = styles[risk];

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-m font-medium ring-1 ${style.bg} ${style.text} ${style.ring}`}
    >
      {riskLabels[risk]}
    </span>
  );
}

export default function DashboardPage() {
  const [loading, setLoading] = React.useState(true);
  const [analysis, setAnalysis] = React.useState<AnalysisResponse | null>(null);
  const [chartData, setChartData] = React.useState<DashboardChartData | null>(null);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;
    async function loadLatestAnalysis() {
      try {
        const response = await fetch("/api/dashboard");
        const payload = (await response.json()) as {
          data?: AnalysisResponse | null;
          charts?: DashboardChartData;
          message?: string;
        };
        if (!response.ok) throw new Error(payload.message ?? "โหลดผลวิเคราะห์ไม่สำเร็จ");
        if (!payload.charts) throw new Error("โหลดข้อมูลกราฟไม่สำเร็จ");
        if (!cancelled) {
          setAnalysis(payload.data ?? null);
          setChartData(payload.charts);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "โหลดผลวิเคราะห์ไม่สำเร็จ");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadLatestAnalysis();
    return () => {
      cancelled = true;
    };
  }, []);

  const summary = analysis
    ? {
        yieldPerRaiKg: analysis.yield.kgPerRai,
        forecastPriceBahtPerKg: analysis.price.thbPerKg,
        diseaseRisk: analysis.diseaseRisk.level,
        expectedRevenueBaht: analysis.economics.expectedRevenueThb,
        totalCostBaht: analysis.economics.totalCostThb,
        profitPerHarvestBaht: analysis.economics.expectedProfitThb,
        costBreakdown: [
          { label: "ต้นทุนจากข้อมูลการเพาะปลูก", value: analysis.economics.totalCostThb },
        ],
      }
    : {
        ...dashboardSummary,
        diseaseRisk: "MEDIUM" as RiskLevel,
      };
  const totalCost = summary.totalCostBaht;
  const expectedRevenue = summary.expectedRevenueBaht;
  const breakEvenRatio = Math.min(1, totalCost / Math.max(1, expectedRevenue));
  const priceChart = chartData?.price.length
    ? chartData.price
    : monthlyMock.map((item) => ({ date: item.month, historicalPrice: item.price }));
  const economicsChart = chartData?.economics.length
    ? chartData.economics
    : monthlyMock.map((item) => ({
        label: item.month,
        cost: item.cost,
        revenue: item.revenue,
        profit: item.revenue - item.cost,
      }));
  const yieldChart = chartData?.yield ?? [];

  const chartAxisStroke = "var(--chart-axis)";
  const chartLegendColor = "var(--chart-legend)";
  const chartGridStroke = "rgba(255,255,255,0.18)";

  return (
    <DashboardShell title="หน้าหลัก">
      <div className="grid gap-5 [--chart-axis:rgba(15,23,42,0.72)] [--chart-legend:rgba(15,23,42,0.72)] [--chart-background:rgba(255,255,255,0.82)] [--chart-border:rgba(255,255,255,0.35)] [--chart-text:rgba(15,23,42,0.90)] dark:[--chart-axis:rgba(226,232,240,0.80)] dark:[--chart-legend:rgba(226,232,240,0.80)] dark:[--chart-background:rgba(2,6,23,0.72)] dark:[--chart-border:rgba(255,255,255,0.18)] dark:[--chart-text:rgba(241,245,249,0.92)]">
        {error ? <div role="alert" className="rounded-2xl bg-rose-100/50 p-4 text-base text-rose-800 dark:bg-rose-950/30 dark:text-rose-200">{error}</div> : null}
        {!loading && !analysis && !error ? (
          <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-semibold text-ink-900 dark:text-slate-100">ยังไม่มีผลวิเคราะห์ในบัญชีนี้</div>
              <div className="mt-1 text-sm text-ink-500 dark:text-slate-300">ค่าบนการ์ดและกราฟเป็นข้อมูลสังเคราะห์สำหรับดูตัวอย่างเท่านั้น</div>
            </div>
            <Link href="/input" className="text-sm font-medium text-moss-600 hover:underline dark:text-moss-400">เริ่มวิเคราะห์</Link>
          </Card>
        ) : null}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Card className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-base text-ink-500/80 dark:text-slate-300/70">
                  ปริมาณผลผลิตคาดการณ์
                </div>
                <div className="mt-2 text-2xl font-semibold text-ink-900 dark:text-slate-100">
                  {loading ? (
                    <Skeleton className="h-8 w-32" />
                  ) : (
                    `${formatNumber(summary.yieldPerRaiKg)} กก./ไร่`
                  )}
                </div>
              </div>
              <div className="rounded-3xl bg-white/35 p-2 text-moss-600 dark:bg-white/10 dark:text-moss-400">
                <Sprout className="h-5 w-5" />
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-base text-ink-500/80 dark:text-slate-300/70">
                  ราคาคาดการณ์
                </div>
                <div className="mt-2 text-2xl font-semibold text-ink-900 dark:text-slate-100">
                  {loading ? (
                    <Skeleton className="h-8 w-32" />
                  ) : (
                    `${formatNumber(summary.forecastPriceBahtPerKg)} บาท/กก.`
                  )}
                </div>
              </div>
              <div className="rounded-3xl bg-white/35 p-2 text-moss-600 dark:bg-white/10 dark:text-moss-400">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-base text-ink-500/80 dark:text-slate-300/70">
                  ความเสี่ยงโรคพืช
                </div>
                <div className="mt-2">
                  {loading ? (
                    <Skeleton className="h-7 w-24" />
                  ) : (
                    <RiskPill risk={summary.diseaseRisk} />
                  )}
                </div>
              </div>
              <div className="rounded-3xl bg-white/35 p-2 text-moss-600 dark:bg-white/10 dark:text-moss-400">
                <Bug className="h-5 w-5" />
              </div>
            </div>
          </Card>

          <Card className="p-5 md:col-span-2 xl:col-span-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-base text-ink-500/80 dark:text-slate-300/70">
                  รายได้ที่คาดการณ์
                </div>
                <div className="mt-2 text-2xl font-semibold text-ink-900 dark:text-slate-100">
                  {loading ? (
                    <Skeleton className="h-8 w-40" />
                  ) : (
                    `${formatNumber(summary.expectedRevenueBaht)} บาท`
                  )}
                </div>
              </div>
              <div className="rounded-3xl bg-white/35 p-2 text-moss-600 dark:bg-white/10 dark:text-moss-400">
                <CircleDollarSign className="h-5 w-5" />
              </div>
            </div>
          </Card>

          <Card className="p-5 md:col-span-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-base text-ink-500/80 dark:text-slate-300/70">
                  ต้นทุนรวม และ รายละเอียดของต้นทุน
                </div>
                <div className="mt-2 text-2xl font-semibold text-ink-900 dark:text-slate-100">
                  {loading ? (
                    <Skeleton className="h-8 w-40" />
                  ) : (
                    `${formatNumber(summary.totalCostBaht)} บาท`
                  )}
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {summary.costBreakdown.map((c) => (
                    <div
                      key={c.label}
                      className="flex items-center justify-between rounded-2xl border border-white/30 bg-white/20 px-3 py-2 text-base backdrop-blur-lg dark:border-white/10 dark:bg-white/5"
                    >
                      <div className="flex items-center gap-2 text-ink-700 dark:text-slate-200">
                        <Leaf className="h-4 w-4 text-moss-600 dark:text-moss-400" />
                        <span className="truncate">{c.label}</span>
                      </div>
                      <span className="font-medium text-ink-900 dark:text-slate-100">
                        {formatNumber(c.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl bg-white/35 p-2 text-moss-600 dark:bg-white/10 dark:text-moss-400">
                <PiggyBank className="h-5 w-5" />
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-base text-ink-500/80 dark:text-slate-300/70">
                  กำไรต่อรอบการเก็บเกี่ยว
                </div>
                <div className="mt-2 text-2xl font-semibold text-ink-900 dark:text-slate-100">
                  {loading ? (
                    <Skeleton className="h-8 w-32" />
                  ) : (
                    `${formatNumber(summary.profitPerHarvestBaht)} บาท`
                  )}
                </div>
              </div>
              <div className="rounded-3xl bg-white/35 p-2 text-moss-600 dark:bg-white/10 dark:text-moss-400">
                <LineChartIcon className="h-5 w-5" />
              </div>
            </div>
          </Card>
        </div>

        {analysis ? (
          <Card className="p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex items-center gap-2 text-base font-semibold text-ink-900 dark:text-slate-100">
                  <CalendarDays className="h-4 w-4 text-moss-600 dark:text-moss-400" />
                  ผลวิเคราะห์ล่าสุด
                </div>
                <div className="mt-1 text-sm text-ink-500 dark:text-slate-300">
                  {analysis.dataQuality.origin === "SYNTHETIC" ? "ข้อมูลสังเคราะห์สำหรับ development" : `แหล่งข้อมูล ${analysis.dataQuality.origin}`}
                  {analysis.dataQuality.stale ? " · ข้อมูลอาจเก่า" : " · ข้อมูลปัจจุบัน"} · {analysis.yield.modelVersion}
                </div>
              </div>
              <Link
                href="/input"
                className="text-sm font-medium text-moss-600 hover:underline dark:text-moss-400"
              >
                วิเคราะห์รอบใหม่
              </Link>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-white/30 bg-white/15 p-3 dark:border-white/10 dark:bg-white/5">
                <div className="text-sm text-ink-500 dark:text-slate-300">ผลผลิตรวม</div>
                <div className="mt-1 font-semibold text-ink-900 dark:text-slate-100">
                  {formatNumber(analysis.yield.totalKg)} กก.
                </div>
              </div>
              <div className="rounded-2xl border border-white/30 bg-white/15 p-3 dark:border-white/10 dark:bg-white/5">
                <div className="text-sm text-ink-500 dark:text-slate-300">คาดว่าจะเก็บเกี่ยว</div>
                <div className="mt-1 font-semibold text-ink-900 dark:text-slate-100">
                  {formatDate(analysis.expectedHarvestDate)}
                </div>
              </div>
              <div className="rounded-2xl border border-white/30 bg-white/15 p-3 dark:border-white/10 dark:bg-white/5">
                <div className="text-sm text-ink-500 dark:text-slate-300">ราคาคุ้มทุน</div>
                <div className="mt-1 font-semibold text-ink-900 dark:text-slate-100">
                  {formatNumber(analysis.economics.breakEvenPriceThbPerKg)} บาท/กก.
                </div>
              </div>
              <div className="rounded-2xl border border-white/30 bg-white/15 p-3 dark:border-white/10 dark:bg-white/5">
                <div className="text-sm text-ink-500 dark:text-slate-300">จุดคุ้มทุนผลผลิต</div>
                <div className="mt-1 font-semibold text-ink-900 dark:text-slate-100">
                  {formatNumber(analysis.economics.breakEvenYieldKg)} กก.
                </div>
              </div>
            </div>
          </Card>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-2">
          <ChartCard title="กราฟแนวโน้มราคา" subtitle="ข้อมูลตัวอย่างสำหรับ development · หน่วย: บาท">
            <div className="h-72">
              {loading ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={priceChart}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={chartGridStroke}
                    />
                    <XAxis
                      dataKey="date"
                      stroke={chartAxisStroke}
                      tick={{ fill: chartAxisStroke }}
                      fontSize={12}
                    />
                    <YAxis
                      stroke={chartAxisStroke}
                      tick={{ fill: chartAxisStroke }}
                      fontSize={12}
                    />
                    <Tooltip
                      cursor={{
                        stroke: "var(--chart-axis)",
                        strokeWidth: 1,
                      }}
                      contentStyle={{
                        background: "var(--chart-background)",
                        border: "1px solid var(--chart-border)",
                        borderRadius: 16,
                        color: "var(--chart-text)",
                        backdropFilter: "blur(18px)",
                      }}
                      labelStyle={{ color: "var(--chart-text)" }}
                      itemStyle={{ color: "var(--chart-text)" }}
                    />
                    <Legend wrapperStyle={{ color: chartLegendColor }} />
                    <Line
                      type="monotone"
                      dataKey="historicalPrice"
                      name="ราคาย้อนหลัง (บาท/กก.)"
                      stroke="#00a05b93"
                      strokeWidth={3}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="forecastPrice"
                      name="ราคาคาดการณ์ (บาท/กก.)"
                      stroke="#e5b84b"
                      strokeWidth={3}
                      strokeDasharray="6 4"
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </ChartCard>

          <ChartCard
            title="กราฟวิเคราะห์จุดคุ้มทุน"
            subtitle="ข้อมูลตัวอย่างสำหรับ development · ต้นทุน vs รายได้"
            right={
              <div className="text-right">
                <div className="text-base text-ink-500/80 dark:text-slate-300/70">
                  สัดส่วนต้นทุน/รายได้
                </div>
                <div className="mt-1 text-base font-semibold text-ink-900 dark:text-slate-100">
                  {loading ? "..." : `${Math.round(breakEvenRatio * 100)}%`}
                </div>
              </div>
            }
          >
            <div className="h-72">
              {loading ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={economicsChart}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={chartGridStroke}
                    />
                    <XAxis
                      dataKey="label"
                      stroke={chartAxisStroke}
                      tick={{ fill: chartAxisStroke }}
                      fontSize={12}
                    />
                    <YAxis
                      stroke={chartAxisStroke}
                      tick={{ fill: chartAxisStroke }}
                      fontSize={12}
                    />
                    <Tooltip
                      cursor={{
                        stroke: "rgba(255,255,255,0.25)",
                        strokeWidth: 1,
                      }}
                      contentStyle={{
                        background: "rgba(255,255,255,0.82)",
                        border: "1px solid rgba(255,255,255,0.35)",
                        borderRadius: 16,
                        color: "rgba(15,23,42,0.90)",
                        backdropFilter: "blur(18px)",
                      }}
                      labelStyle={{ color: "rgba(15,23,42,0.85)" }}
                      itemStyle={{ color: "rgba(15,23,42,0.85)" }}
                    />
                    <Legend wrapperStyle={{ color: "rgba(15,23,42,0.72)" }} />
                    <Area
                      type="monotone"
                      dataKey="cost"
                      name="ต้นทุน (บาท)"
                      stroke="#f1d77d"
                      fill="#f1d77d"
                      fillOpacity={0.18}
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      name="รายได้ (บาท)"
                      stroke="#3aa879"
                      fill="#3aa879"
                      fillOpacity={0.18}
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="profit"
                      name="กำไร (บาท)"
                      stroke="#5d8ee8"
                      fill="#5d8ee8"
                      fillOpacity={0.14}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="mt-4 grid gap-2 rounded-3xl border border-white/30 bg-white/20 p-4 text-base backdrop-blur-lg dark:border-white/10 dark:bg-white/5">
              <div className="flex items-center justify-between">
                <span className="text-ink-500 dark:text-slate-300">
                  ต้นทุนรวม
                </span>
                <span className="font-medium text-ink-900 dark:text-slate-100">
                  {formatNumber(totalCost)} บาท
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-500 dark:text-slate-300">
                  รายได้คาดการณ์
                </span>
                <span className="font-medium text-ink-900 dark:text-slate-100">
                  {formatNumber(expectedRevenue)} บาท
                </span>
              </div>
            </div>
          </ChartCard>

          <ChartCard title="เปรียบเทียบผลผลิต" subtitle="ผลผลิตสังเกตเทียบกับค่าคาดการณ์ · หน่วย: กก./ไร่">
            <div className="h-72">
              {loading ? (
                <Skeleton className="h-full w-full" />
              ) : !analysis || yieldChart.length === 0 ? (
                <div className="grid h-full place-items-center rounded-2xl border border-dashed border-white/30 bg-white/10 p-5 text-center text-sm text-ink-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                  สร้างผลวิเคราะห์อย่างน้อย 1 รอบเพื่อดูการเปรียบเทียบผลผลิต
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={yieldChart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} />
                    <XAxis dataKey="label" stroke={chartAxisStroke} tick={{ fill: chartAxisStroke }} fontSize={12} />
                    <YAxis stroke={chartAxisStroke} tick={{ fill: chartAxisStroke }} fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        background: "var(--chart-background)",
                        border: "1px solid var(--chart-border)",
                        borderRadius: 16,
                        color: "var(--chart-text)",
                      }}
                    />
                    <Legend wrapperStyle={{ color: chartLegendColor }} />
                    <Bar dataKey="observedKgPerRai" name="ผลผลิตสังเกต" fill="#94b8a3" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="predictedKgPerRai" name="ผลผลิตคาดการณ์" fill="#3aa879" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            {chartData?.stale ? (
              <div className="mt-3 text-xs text-amber-700 dark:text-amber-200">ข้อมูลที่ใช้มีสถานะ stale ควรตรวจแหล่งข้อมูลก่อนตัดสินใจ</div>
            ) : null}
          </ChartCard>
        </div>
      </div>
    </DashboardShell>
  );
}
