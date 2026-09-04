import { NextResponse } from "next/server";

import { hasPermission } from "@/lib/application/authorization";
import { modelRepository, ModelRepositoryError } from "@/lib/repositories/modelRepository";
import { userFromRequest } from "@/lib/server/session";

export async function POST(
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
  if (!hasPermission(user.role, "model:manage")) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "ไม่มีสิทธิ์ activate model" },
      { status: 403 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "INVALID_JSON", message: "ต้องยืนยันการ activate ด้วย JSON" },
      { status: 400 },
    );
  }
  if (!payload || typeof payload !== "object" || (payload as { confirm?: unknown }).confirm !== true) {
    return NextResponse.json(
      { error: "CONFIRMATION_REQUIRED", message: "ต้องส่ง confirm: true" },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json({ model: await modelRepository.activate(params.id) });
  } catch (error) {
    if (error instanceof ModelRepositoryError) {
      return NextResponse.json(
        { error: error.code, message: "ไม่สามารถ activate model นี้ได้" },
        { status: error.code === "NOT_FOUND" ? 404 : 409 },
      );
    }
    return NextResponse.json(
      { error: "MODEL_ACTIVATION_FAILED", message: "ไม่สามารถ activate model ได้" },
      { status: 500 },
    );
  }
}
