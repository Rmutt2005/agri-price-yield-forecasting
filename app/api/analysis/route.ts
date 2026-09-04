import { NextResponse } from "next/server";

import {
  analyzeCultivation,
  validateAnalysisInput,
} from "@/lib/application/analysisService";
import { analysisRepository } from "@/lib/repositories/analysisRepository";
import { ModelRepositoryError } from "@/lib/repositories/modelRepository";
import { userFromRequest } from "@/lib/server/session";
import { systemStatusRepository } from "@/lib/repositories/systemStatusRepository";

export async function GET(request: Request) {
  const user = await userFromRequest(request);
  if (!user) {
    return NextResponse.json(
      { error: "UNAUTHENTICATED", message: "กรุณาเข้าสู่ระบบ" },
      { status: 401 },
    );
  }
  return NextResponse.json({
    data: (await analysisRepository.listForUser(user.id)).map((record) => record.response),
  });
}

export async function POST(request: Request) {
  const user = await userFromRequest(request);
  if (!user) {
    return NextResponse.json(
      { error: "UNAUTHENTICATED", message: "กรุณาเข้าสู่ระบบก่อนสร้างผลวิเคราะห์" },
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
      {
        error: "INVALID_JSON",
        message: "request body ต้องเป็น JSON ที่ถูกต้อง",
      },
      { status: 400 },
    );
  }

  const validation = await validateAnalysisInput(payload);
  if ("issues" in validation) {
    return NextResponse.json(
      {
        error: "VALIDATION_ERROR",
        issues: validation.issues,
      },
      { status: 400 },
    );
  }

  try {
    const result = await analyzeCultivation(validation.input);
    const persisted = await analysisRepository.save(validation.input, result, user.id);
    return NextResponse.json(persisted.response);
  } catch (error) {
    if (error instanceof ModelRepositoryError &&
        (error.code === "NO_ACTIVE_MODEL" || error.code === "CORRUPT_ARTIFACT")) {
      return NextResponse.json(
        { error: "MODEL_UNAVAILABLE", message: "active model ยังไม่พร้อมสำหรับการวิเคราะห์" },
        { status: 503 },
      );
    }
    return NextResponse.json(
      {
        error: "ANALYSIS_FAILED",
        message: "ไม่สามารถสร้างผลวิเคราะห์ได้ในขณะนี้",
      },
      { status: 500 },
    );
  }
}
