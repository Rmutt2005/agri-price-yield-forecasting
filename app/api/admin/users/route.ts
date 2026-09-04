import { NextResponse } from "next/server";

import { hasPermission } from "@/lib/application/authorization";
import { authRepository } from "@/lib/repositories/authRepository";
import { userFromRequest } from "@/lib/server/session";

export async function GET(request: Request) {
  const user = await userFromRequest(request);
  if (!user) {
    return NextResponse.json(
      { error: "UNAUTHENTICATED", message: "กรุณาเข้าสู่ระบบ" },
      { status: 401 },
    );
  }
  if (!hasPermission(user.role, "user:manage")) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "ไม่มีสิทธิ์จัดการผู้ใช้" },
      { status: 403 },
    );
  }
  return NextResponse.json({ data: await authRepository.listUsers(undefined, { includeInactive: true }) });
}
