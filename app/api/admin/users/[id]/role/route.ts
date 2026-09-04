import { NextResponse } from "next/server";

import { hasPermission } from "@/lib/application/authorization";
import { validateRoleUpdate } from "@/lib/application/adminService";
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
  if (!hasPermission(user.role, "user:manage")) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "ไม่มีสิทธิ์เปลี่ยน role" },
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
  const validation = validateRoleUpdate(payload);
  if ("issues" in validation) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", issues: validation.issues },
      { status: 400 },
    );
  }
  try {
    return NextResponse.json({ user: await authRepository.updateRole(params.id, validation.role) });
  } catch (error) {
    if (error instanceof AuthRepositoryError && error.code === "NOT_FOUND") {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "ไม่พบผู้ใช้" },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { error: "ROLE_UPDATE_FAILED", message: "ไม่สามารถเปลี่ยน role ได้" },
      { status: 500 },
    );
  }
}
