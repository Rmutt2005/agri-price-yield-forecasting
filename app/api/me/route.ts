import { NextResponse } from "next/server";

import { validateProfileUpdate } from "@/lib/application/authService";
import { AuthRepositoryError, authRepository } from "@/lib/repositories/authRepository";
import { userFromRequest } from "@/lib/server/session";

export async function GET(request: Request) {
  const user = await userFromRequest(request);
  if (!user) {
    return NextResponse.json(
      { error: "UNAUTHENTICATED", message: "กรุณาเข้าสู่ระบบ" },
      { status: 401 },
    );
  }
  return NextResponse.json({ user });
}

export async function PATCH(request: Request) {
  const user = await userFromRequest(request);
  if (!user) {
    return NextResponse.json(
      { error: "UNAUTHENTICATED", message: "กรุณาเข้าสู่ระบบ" },
      { status: 401 },
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
  const validation = validateProfileUpdate(payload);
  if ("issues" in validation) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", issues: validation.issues },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json({ user: await authRepository.updateProfile(user.id, validation.input) });
  } catch (error) {
    if (error instanceof AuthRepositoryError && error.code === "EMAIL_EXISTS") {
      return NextResponse.json(
        { error: "EMAIL_EXISTS", message: "อีเมลนี้ถูกใช้งานแล้ว" },
        { status: 409 },
      );
    }
    if (error instanceof AuthRepositoryError && error.code === "INVALID_PASSWORD") {
      return NextResponse.json(
        { error: "INVALID_PASSWORD", message: "รหัสผ่านเดิมไม่ถูกต้อง" },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "PROFILE_UPDATE_FAILED", message: "ไม่สามารถแก้ไขข้อมูลได้" },
      { status: 500 },
    );
  }
}
