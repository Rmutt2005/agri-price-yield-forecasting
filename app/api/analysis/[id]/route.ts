import { NextResponse } from "next/server";

import { analysisRepository } from "@/lib/repositories/analysisRepository";
import { userFromRequest } from "@/lib/server/session";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const user = await userFromRequest(_request);
  if (!user) {
    return NextResponse.json(
      { error: "UNAUTHENTICATED", message: "กรุณาเข้าสู่ระบบ" },
      { status: 401 },
    );
  }

  const record = await analysisRepository.findByIdForUser(params.id, user.id);
  if (!record) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "ไม่พบผลวิเคราะห์นี้" },
      { status: 404 },
    );
  }

  return NextResponse.json(record.response);
}
