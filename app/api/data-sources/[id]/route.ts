import { NextResponse } from "next/server";

import { hasPermission } from "@/lib/application/authorization";
import { dataSourceRepository } from "@/lib/repositories/dataSourceRepository";
import type { DataSourceStatus } from "@/lib/domain/types";
import { userFromRequest } from "@/lib/server/session";

const STATUSES: readonly DataSourceStatus[] = ["ACTIVE", "DEGRADED", "DISABLED", "ERROR"];

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const user = await userFromRequest(request);
  if (!user) {
    return NextResponse.json(
      { error: "UNAUTHENTICATED", message: "กรุณาเข้าสู่ระบบ" },
      { status: 401 },
    );
  }
  if (!hasPermission(user.role, "ingestion:manage")) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "ไม่มีสิทธิ์แก้ไข data source" },
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
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "request body ต้องเป็น object" },
      { status: 400 },
    );
  }
  const body = payload as Record<string, unknown>;
  const patch: { enabled?: boolean; priority?: number; status?: DataSourceStatus } = {};
  if (body.enabled !== undefined) {
    if (typeof body.enabled !== "boolean") {
      return NextResponse.json({ error: "VALIDATION_ERROR", message: "enabled ต้องเป็น boolean" }, { status: 400 });
    }
    patch.enabled = body.enabled;
  }
  if (body.priority !== undefined) {
    if (typeof body.priority !== "number" || !Number.isInteger(body.priority) || body.priority < 0) {
      return NextResponse.json({ error: "VALIDATION_ERROR", message: "priority ต้องเป็นจำนวนเต็มไม่ติดลบ" }, { status: 400 });
    }
    patch.priority = body.priority;
  }
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status as DataSourceStatus)) {
      return NextResponse.json({ error: "VALIDATION_ERROR", message: "status ไม่ถูกต้อง" }, { status: 400 });
    }
    patch.status = body.status as DataSourceStatus;
  }

  const source = await dataSourceRepository.update(params.id, patch);
  if (!source) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "ไม่พบ data source" },
      { status: 404 },
    );
  }
  return NextResponse.json({ source });
}
