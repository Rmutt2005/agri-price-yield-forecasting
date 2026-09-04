import { NextResponse } from "next/server";

import { validateRegistration } from "@/lib/application/authService";
import { AuthRepositoryError, authRepository } from "@/lib/repositories/authRepository";
import { sessionCookie } from "@/lib/server/session";

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "INVALID_JSON", message: "request body ต้องเป็น JSON ที่ถูกต้อง" },
      { status: 400 },
    );
  }

  const validation = validateRegistration(payload);
  if ("issues" in validation) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", issues: validation.issues },
      { status: 400 },
    );
  }

  try {
    const result = await authRepository.register(validation.input);
    const response = NextResponse.json({ user: result.user }, { status: 201 });
    response.headers.set("Set-Cookie", sessionCookie(result.sessionToken));
    return response;
  } catch (error) {
    if (error instanceof AuthRepositoryError && error.code === "EMAIL_EXISTS") {
      return NextResponse.json(
        { error: "EMAIL_EXISTS", message: "อีเมลนี้ถูกใช้งานแล้ว" },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "REGISTER_FAILED", message: "ไม่สามารถสมัครสมาชิกได้" },
      { status: 500 },
    );
  }
}
