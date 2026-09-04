import { NextResponse } from "next/server";

import { validateAnalysisInput } from "@/lib/application/analysisService";
import { cultivationRepository } from "@/lib/repositories/cultivationRepository";
import { systemStatusRepository } from "@/lib/repositories/systemStatusRepository";
import { userFromRequest } from "@/lib/server/session";

export async function GET(request: Request) {
  const user = await userFromRequest(request);
  if (!user) {
    return NextResponse.json(
      { error: "UNAUTHENTICATED", message: "กรุณาเข้าสู่ระบบ" },
      { status: 401 },
    );
  }
  return NextResponse.json({ data: await cultivationRepository.listForUser(user.id) });
}

export async function POST(request: Request) {
  const user = await userFromRequest(request);
  if (!user) {
    return NextResponse.json(
      { error: "UNAUTHENTICATED", message: "กรุณาเข้าสู่ระบบ" },
      { status: 401 },
    );
  }
  if ((await systemStatusRepository.get()).mode === "MAINTENANCE") {
    return NextResponse.json(
      { error: "MAINTENANCE", message: "ระบบอยู่ระหว่างปรับปรุงชั่วคราว" },
      { status: 503 },
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
  const validation = await validateAnalysisInput(payload);
  if ("issues" in validation) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", issues: validation.issues },
      { status: 400 },
    );
  }
  return NextResponse.json(
    { cultivation: await cultivationRepository.create(user.id, validation.input) },
    { status: 201 },
  );
}
