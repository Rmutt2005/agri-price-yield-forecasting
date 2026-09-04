import { NextResponse } from "next/server";

import { validateUserStatusUpdate } from "@/lib/application/adminService";
import { hasPermission } from "@/lib/application/authorization";
import { AuthRepositoryError, authRepository } from "@/lib/repositories/authRepository";
import { userFromRequest } from "@/lib/server/session";

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
  if (!hasPermission(user.role, "user:status")) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "ไม่มีสิทธิ์จัดการสถานะผู้ใช้" },
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
  const validation = validateUserStatusUpdate(payload);
  if ("issues" in validation) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", issues: validation.issues },
      { status: 400 },
    );
  }

  const target = await authRepository.findByIdIncludingInactive(params.id);
  if (!target) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "ไม่พบผู้ใช้" },
      { status: 404 },
    );
  }
  if (target.id === user.id && !validation.active) {
    return NextResponse.json(
      { error: "SELF_DEACTIVATION_NOT_ALLOWED", message: "ไม่อนุญาตให้ปิดบัญชีของตนเอง" },
      { status: 409 },
    );
  }
  if (user.role === "OFFICER" && target.role !== "USER") {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "Officer จัดการได้เฉพาะผู้ใช้ทั่วไป" },
      { status: 403 },
    );
  }

  try {
    return NextResponse.json({ user: await authRepository.updateActive(params.id, validation.active) });
  } catch (error) {
    if (error instanceof AuthRepositoryError && error.code === "NOT_FOUND") {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "ไม่พบผู้ใช้" },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { error: "USER_STATUS_UPDATE_FAILED", message: "ไม่สามารถเปลี่ยนสถานะผู้ใช้ได้" },
      { status: 500 },
    );
  }
}
