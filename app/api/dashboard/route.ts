import { NextResponse } from "next/server";

import { buildDashboardChartData } from "@/lib/application/dashboardService";
import { analysisRepository } from "@/lib/repositories/analysisRepository";
import { observationRepository } from "@/lib/repositories/observationRepository";
import { userFromRequest } from "@/lib/server/session";

export async function GET(request: Request) {
  const user = await userFromRequest(request);
  if (!user) {
    return NextResponse.json(
      { error: "UNAUTHENTICATED", message: "กรุณาเข้าสู่ระบบ" },
      { status: 401 },
    );
  }

  const record = (await analysisRepository.listForUser(user.id))[0];
  return NextResponse.json({
    data: record?.response ?? null,
    charts: await buildDashboardChartData(record, {
      prices: await observationRepository.listPrices(),
      yields: await observationRepository.listYields(),
    }),
  });
}
