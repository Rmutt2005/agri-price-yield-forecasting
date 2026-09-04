import { describe, expect, it } from "vitest";

import {
  validateLogin,
  validateProfileUpdate,
  validateRegistration,
} from "@/lib/application/authService";

describe("auth validation", () => {
  it("rejects a short password and mismatched confirmation", () => {
    const result = validateRegistration({
      fullName: "Test User",
      email: "test@example.com",
      password: "short",
      confirmPassword: "different",
    });

    expect("issues" in result).toBe(true);
    if ("issues" in result) {
      expect(result.issues?.map((issue) => issue.field)).toEqual(
        expect.arrayContaining(["password", "confirmPassword"]),
      );
    }
  });

  it("normalizes valid login and profile input", () => {
    expect(validateLogin({ email: " USER@EXAMPLE.COM ", password: "password123" })).toEqual({
      input: { email: "user@example.com", password: "password123" },
    });
    expect(validateProfileUpdate({ fullName: " New Name ", email: "NEW@EXAMPLE.COM" })).toEqual({
      input: { fullName: "New Name", email: "new@example.com" },
    });
  });
});
