import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { FileArtifactStore, InMemoryArtifactStore } from "@/lib/repositories/artifactStore";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("artifact stores", () => {
  it("keeps in-memory artifacts addressable by checksum", async () => {
    const store = new InMemoryArtifactStore();
    const written = await store.putJson("model-v1", { version: 1, value: 700 });

    expect(written.location).toBe("memory-artifact://model-v1");
    expect(await store.exists(written.location, written.checksum)).toBe(true);
    expect(await store.readJson(written.location, written.checksum)).toEqual({ version: 1, value: 700 });
    expect(() => store.readJson(written.location, "bad-checksum")).toThrow("checksum mismatch");
    expect(() => store.putJson("model-v1", { version: 2, value: 701 })).toThrow("different payload");
  });

  it("persists immutable JSON artifacts under a validated root", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "agri-artifacts-"));
    temporaryDirectories.push(directory);
    const store = new FileArtifactStore(directory);
    const written = await store.putJson("dataset-2026-09-04", { rows: 3 });

    expect(written.location).toBe("file-artifact://dataset-2026-09-04.json");
    expect(await store.exists(written.location, written.checksum)).toBe(true);
    expect(await store.readJson(written.location, written.checksum)).toEqual({ rows: 3 });
    const normalized = await store.putJson("../escape", { bad: true });
    expect(normalized.location).toBe("file-artifact://..-escape.json");
    await expect(store.readJson("file-artifact://../escape.json")).rejects.toThrow("Unsafe artifact location");
    await expect(store.putJson("dataset-2026-09-04", { rows: 4 })).rejects.toThrow("different payload");
  });
});
