import { NextResponse } from "next/server";

import { validateLogin } from "@/lib/application/authService";
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

  const validation = validateLogin(payload);
  if ("issues" in validation) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", issues: validation.issues },
      { status: 400 },
    );
  }

  try {
    const result = await authRepository.authenticate(
      validation.input.email,
      validation.input.password,
    );
    const response = NextResponse.json({ user: result.user });
    response.headers.set("Set-Cookie", sessionCookie(result.sessionToken));
    return response;
  } catch (error) {
    if (error instanceof AuthRepositoryError && error.code === "INVALID_CREDENTIALS") {
      return NextResponse.json(
        { error: "INVALID_CREDENTIALS", message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" },
        { status: 401 },
      );
    }
    return NextResponse.json(
      { error: "LOGIN_FAILED", message: "ไม่สามารถเข้าสู่ระบบได้" },
      { status: 500 },
    );
  }
}
