import { describe, expect, it } from "vitest";

import {
  validateRoleUpdate,
  validateSystemStatusUpdate,
} from "@/lib/application/adminService";

describe("admin validation", () => {
  it("accepts valid role and maintenance changes", () => {
    expect(validateRoleUpdate({ role: "OFFICER" })).toEqual({ role: "OFFICER" });
    expect(validateSystemStatusUpdate({ mode: "MAINTENANCE", message: "deploy" })).toEqual({
      mode: "MAINTENANCE",
      message: "deploy",
    });
  });

  it("rejects invalid admin values", () => {
    expect("issues" in validateRoleUpdate({ role: "ROOT" })).toBe(true);
    expect("issues" in validateSystemStatusUpdate({ mode: "OFFLINE" })).toBe(true);
  });
});
