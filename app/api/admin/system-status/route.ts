import { NextResponse } from "next/server";

import { hasPermission } from "@/lib/application/authorization";
import { validateSystemStatusUpdate } from "@/lib/application/adminService";
import { systemStatusRepository } from "@/lib/repositories/systemStatusRepository";
import { userFromRequest } from "@/lib/server/session";

async function authorizedUser(request: Request) {
  const user = await userFromRequest(request);
  if (!user) return { response: NextResponse.json({ error: "UNAUTHENTICATED", message: "กรุณาเข้าสู่ระบบ" }, { status: 401 }) };
  if (!hasPermission(user.role, "system-status:manage")) {
    return { response: NextResponse.json({ error: "FORBIDDEN", message: "ไม่มีสิทธิ์จัดการ system status" }, { status: 403 }) };
  }
  return { user };
}

export async function GET(request: Request) {
  const authorization = await authorizedUser(request);
  if ("response" in authorization) return authorization.response;
  return NextResponse.json({ status: await systemStatusRepository.get() });
}

export async function PATCH(request: Request) {
  const authorization = await authorizedUser(request);
  if ("response" in authorization) return authorization.response;
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "INVALID_JSON", message: "request body ต้องเป็น JSON ที่ถูกต้อง" },
      { status: 400 },
    );
  }
  const validation = validateSystemStatusUpdate(payload);
  if ("issues" in validation) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", issues: validation.issues },
      { status: 400 },
    );
  }
  return NextResponse.json({
    status: await systemStatusRepository.set(
      validation.mode,
      validation.message,
      authorization.user.id,
    ),
  });
}
