import { NextResponse } from "next/server";

import { hasPermission } from "@/lib/application/authorization";
import { modelRepository } from "@/lib/repositories/modelRepository";
import { userFromRequest } from "@/lib/server/session";

export async function GET(request: Request) {
  const user = await userFromRequest(request);
  if (!user) {
    return NextResponse.json(
      { error: "UNAUTHENTICATED", message: "กรุณาเข้าสู่ระบบ" },
      { status: 401 },
    );
  }
  if (!hasPermission(user.role, "model:manage")) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "ไม่มีสิทธิ์ดู model registry" },
      { status: 403 },
    );
  }
  const data = await modelRepository.list();
  return NextResponse.json({
    data,
    comparisons: await Promise.all(data
      .filter((model) => model.status === "CANDIDATE")
      .map((model) => modelRepository.compareCandidate(model.id))),
  });
}
