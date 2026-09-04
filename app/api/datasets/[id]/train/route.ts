import { NextResponse } from "next/server";

import { hasPermission } from "@/lib/application/authorization";
import { TrainingServiceError, trainYieldCandidate } from "@/lib/application/trainingService";
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
  if (!hasPermission(user.role, "dataset:manage")) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "ไม่มีสิทธิ์ train model" },
      { status: 403 },
    );
  }

  try {
    const model = await trainYieldCandidate(params.id, user.id);
    return NextResponse.json({ model }, { status: 201 });
  } catch (error) {
    if (error instanceof TrainingServiceError) {
      return NextResponse.json(
        { error: error.code, message: "dataset ยังไม่พร้อมสำหรับ training" },
        { status: error.code === "NOT_FOUND" ? 404 : 409 },
      );
    }
    return NextResponse.json(
      { error: "TRAINING_FAILED", message: "training ไม่สำเร็จ" },
      { status: 500 },
    );
  }
}
