import { describe, expect, it } from "vitest";

import {
  hasPermission,
  permissionsForRole,
} from "@/lib/application/authorization";

describe("authorization policy", () => {
  it("allows users to analyze but not manage models", () => {
    expect(hasPermission("USER", "analysis:create")).toBe(true);
    expect(hasPermission("USER", "model:manage")).toBe(false);
    expect(hasPermission("OFFICER", "user:search")).toBe(true);
    expect(hasPermission("OFFICER", "user:manage")).toBe(false);
  });

  it("gives administrators the complete management policy", () => {
    expect(hasPermission("ADMIN", "user:manage")).toBe(true);
    expect(hasPermission("ADMIN", "system-status:manage")).toBe(true);
    expect(permissionsForRole("ADMIN")).toContain("model:manage");
  });
});
