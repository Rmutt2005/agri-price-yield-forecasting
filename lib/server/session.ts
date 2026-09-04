import { authRepository, SESSION_TTL_SECONDS } from "@/lib/repositories/authRepository";
import type { AuthUser } from "@/lib/repositories/authRepository";

export const SESSION_COOKIE_NAME = "agri_session";

function isProduction() {
  return process.env.NODE_ENV === "production";
}

export function sessionCookie(token: string) {
  return [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${SESSION_TTL_SECONDS}`,
    isProduction() ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

export function expiredSessionCookie() {
  return [
    `${SESSION_COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    isProduction() ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

export function sessionTokenFromRequest(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookie = cookieHeader.split(";").map((part) => part.trim()).find((part) =>
    part.startsWith(`${SESSION_COOKIE_NAME}=`),
  );
  return cookie
    ? decodeURIComponent(cookie.slice(SESSION_COOKIE_NAME.length + 1))
    : undefined;
}

export async function userFromRequest(request: Request): Promise<AuthUser | undefined> {
  const token = sessionTokenFromRequest(request);
  return token ? await authRepository.findBySessionToken(token) : undefined;
}
