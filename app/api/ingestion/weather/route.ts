import { NextResponse } from "next/server";

import { hasPermission } from "@/lib/application/authorization";
import { normalizeWeatherRecords } from "@/lib/application/ingestionService";
import { observationRepository } from "@/lib/repositories/observationRepository";
import { dataSourceRepository } from "@/lib/repositories/dataSourceRepository";
import { userFromRequest } from "@/lib/server/session";

export async function POST(request: Request) {
  const user = await userFromRequest(request);
  if (!user) {
    return NextResponse.json(
      { error: "UNAUTHENTICATED", message: "กรุณาเข้าสู่ระบบ" },
      { status: 401 },
    );
  }
  if (!hasPermission(user.role, "ingestion:manage")) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "ไม่มีสิทธิ์นำเข้าข้อมูลสภาพอากาศ" },
      { status: 403 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "INVALID_JSON", message: "request body ต้องเป็น JSON ที่ถูกต้อง" },
      { status: 400 },
    );
  }
  const body =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? (payload as { sourceKey?: unknown; records?: unknown })
      : {};
  const normalized = await normalizeWeatherRecords(body.sourceKey, body.records);
  const accepted = normalized.records.length > 0
    ? await observationRepository.saveWeather(normalized.records)
    : 0;
  if (normalized.source?.enabled) {
    await dataSourceRepository.update(normalized.source.id, normalized.records.length > 0
      ? { status: "ACTIVE", lastSuccessAt: new Date().toISOString() }
      : { status: "ERROR", lastFailureAt: new Date().toISOString() });
  }
  if (normalized.issues.length > 0 && normalized.records.length === 0) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", accepted: 0, rejected: normalized.issues.length, issues: normalized.issues },
      { status: 400 },
    );
  }
  return NextResponse.json({
    accepted,
    rejected: normalized.issues.length + (normalized.records.length - accepted),
    duplicates: normalized.records.length - accepted,
    issues: normalized.issues,
    source: normalized.source,
  });
}
