import { NextResponse } from "next/server";

import { validateAnalysisInput } from "@/lib/application/analysisService";
import { cultivationRepository } from "@/lib/repositories/cultivationRepository";
import { systemStatusRepository } from "@/lib/repositories/systemStatusRepository";
import { userFromRequest } from "@/lib/server/session";

function unauthorizedResponse() {
  return NextResponse.json(
    { error: "UNAUTHENTICATED", message: "กรุณาเข้าสู่ระบบ" },
    { status: 401 },
  );
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  const user = await userFromRequest(request);
  if (!user) return unauthorizedResponse();
  const cultivation = await cultivationRepository.findByIdForUser(params.id, user.id);
  if (!cultivation) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "ไม่พบ cultivation cycle นี้" },
      { status: 404 },
    );
  }
  return NextResponse.json({ cultivation });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const user = await userFromRequest(request);
  if (!user) return unauthorizedResponse();
  if ((await systemStatusRepository.get()).mode === "MAINTENANCE") {
    return NextResponse.json(
      { error: "MAINTENANCE", message: "ระบบอยู่ระหว่างปรับปรุงชั่วคราว" },
      { status: 503 },
    );
  }
  const existing = await cultivationRepository.findByIdForUser(params.id, user.id);
  if (!existing) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "ไม่พบ cultivation cycle นี้" },
      { status: 404 },
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
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", issues: [{ field: "body", message: "request body ต้องเป็น object" }] },
      { status: 400 },
    );
  }
  const validation = await validateAnalysisInput({ ...existing.input, ...(payload as Record<string, unknown>) });
  if ("issues" in validation) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", issues: validation.issues },
      { status: 400 },
    );
  }
  return NextResponse.json({
    cultivation: await cultivationRepository.updateForUser(params.id, user.id, validation.input, existing.status),
  });
}
