import { NextResponse } from "next/server";

import { authRepository } from "@/lib/repositories/authRepository";
import {
  expiredSessionCookie,
  sessionTokenFromRequest,
} from "@/lib/server/session";

export async function POST(request: Request) {
  const token = sessionTokenFromRequest(request);
  if (token) await authRepository.revokeSession(token);
  const response = NextResponse.json({ ok: true });
  response.headers.set("Set-Cookie", expiredSessionCookie());
  return response;
}
