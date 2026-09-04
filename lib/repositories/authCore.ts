import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

import type { UserRole } from "@/lib/domain/types";

export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export type AuthUser = {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
};

export class AuthRepositoryError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "EMAIL_EXISTS"
      | "INVALID_CREDENTIALS"
      | "INVALID_PASSWORD"
      | "NOT_FOUND",
  ) {
    super(message);
    this.name = "AuthRepositoryError";
  }
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${derivedKey}`;
}

export function verifyPassword(password: string, encodedHash: string) {
  const [, salt, expectedHex] = encodedHash.split("$");
  if (!salt || !expectedHex) return false;
  const expected = Buffer.from(expectedHex, "hex");
  const actual = scryptSync(password, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
