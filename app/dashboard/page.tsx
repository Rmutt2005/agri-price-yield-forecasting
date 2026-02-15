"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
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

function formatNumber(n: number) {
  return new Intl.NumberFormat("th-TH").format(n);
}

function RiskPill({ risk }: { risk: "สูง" | "กลาง" | "ต่ำ" }) {
  const styles: { bg: string; text: string; ring: string } | undefined =
    risk === "สูง"
      ? {
          bg: "bg-white/35 dark:bg-white/10",
          text: "text-rose-700 dark:text-rose-200",
          ring: "ring-white/30 dark:ring-white/10",
        }
      : risk === "กลาง"
        ? {
            bg: "bg-sun-300/25 dark:bg-sun-400/10",
            text: "text-amber-800 dark:text-amber-200",
            ring: "ring-white/30 dark:ring-white/10",
          }
        : {
            bg: "bg-white/35 dark:bg-white/10",
            text: "text-moss-600 dark:text-moss-400",
            ring: "ring-white/30 dark:ring-white/10",
          };

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-m font-medium ring-1 ${styles.bg} ${styles.text} ${styles.ring}`}
    >
      {risk}
    </span>
  );
}

export default function DashboardPage() {
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const t = window.setTimeout(() => setLoading(false), 650);
    return () => window.clearTimeout(t);
  }, []);

  const totalCost = dashboardSummary.totalCostBaht;
  const expectedRevenue = dashboardSummary.expectedRevenueBaht;
  const breakEvenRatio = Math.min(1, totalCost / Math.max(1, expectedRevenue));

  const chartAxisStroke = "var(--chart-axis)";
  const chartLegendColor = "var(--chart-legend)";
  const chartGridStroke = "rgba(255,255,255,0.18)";

  return (
    <DashboardShell title="หน้าหลัก">
      <div className="grid gap-5 [--chart-axis:rgba(15,23,42,0.72)] [--chart-legend:rgba(15,23,42,0.72)] [--chart-background:rgba(255,255,255,0.82)] [--chart-border:rgba(255,255,255,0.35)] [--chart-text:rgba(15,23,42,0.90)] dark:[--chart-axis:rgba(226,232,240,0.80)] dark:[--chart-legend:rgba(226,232,240,0.80)] dark:[--chart-background:rgba(2,6,23,0.72)] dark:[--chart-border:rgba(255,255,255,0.18)] dark:[--chart-text:rgba(241,245,249,0.92)]">
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
                    `${formatNumber(dashboardSummary.yieldPerRaiKg)} กก./ไร่`
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
                    `${formatNumber(dashboardSummary.forecastPriceBahtPerKg)} บาท/กก.`
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
                    <RiskPill risk={dashboardSummary.diseaseRisk} />
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
                    `${formatNumber(dashboardSummary.expectedRevenueBaht)} บาท`
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
                    `${formatNumber(dashboardSummary.totalCostBaht)} บาท`
                  )}
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {dashboardSummary.costBreakdown.map((c) => (
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
                    `${formatNumber(dashboardSummary.profitPerHarvestBaht)} บาท`
                  )}
                </div>
              </div>
              <div className="rounded-3xl bg-white/35 p-2 text-moss-600 dark:bg-white/10 dark:text-moss-400">
                <LineChartIcon className="h-5 w-5" />
              </div>
            </div>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <ChartCard title="กราฟแนวโน้มราคา" subtitle="หน่วย: บาท">
            <div className="h-72">
              {loading ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={monthlyMock}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={chartGridStroke}
                    />
                    <XAxis
                      dataKey="month"
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
                      dataKey="price"
                      name="ราคา (บาท/กก.)"
                      stroke="#00a05b93"
                      strokeWidth={3}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </ChartCard>

          <ChartCard
            title="กราฟวิเคราะห์จุดคุ้มทุน"
            subtitle="ต้นทุน vs รายได้"
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
                    data={monthlyMock}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={chartGridStroke}
                    />
                    <XAxis
                      dataKey="month"
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
        </div>
      </div>
    </DashboardShell>
  );
}
