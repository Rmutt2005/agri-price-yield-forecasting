import { describe, expect, it } from "vitest";

import { InMemoryCultivationRepository } from "@/lib/repositories/cultivationRepository";

describe("cultivation repository ownership", () => {
  it("stores cycles and prevents cross-user reads or updates", () => {
    const repository = new InMemoryCultivationRepository();
    const input = {
      areaKey: "AREA_001",
      cropKey: "HEAD_LETTUCE",
      plantingDate: "2026-09-04",
      areaRai: 2,
      costsPerRai: { fertilizerThb: 100, chemicalThb: 100, laborThb: 100, otherThb: 0 },
    };
    const cycle = repository.create("user-a", input);

    expect(repository.findByIdForUser(cycle.id, "user-a")?.input).toEqual(input);
    expect(repository.findByIdForUser(cycle.id, "user-b")).toBeUndefined();
    expect(repository.updateForUser(cycle.id, "user-b", input)).toBeUndefined();
  });
});
