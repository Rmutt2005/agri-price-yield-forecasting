import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import type { RepositoryResult } from "@/lib/repositories/types";

export type ArtifactRecord = {
  location: string;
  checksum: string;
  bytes: number;
};

export interface ArtifactStore {
  putJson(key: string, payload: unknown): RepositoryResult<ArtifactRecord>;
  readJson<T>(location: string, expectedChecksum?: string): RepositoryResult<T | undefined>;
  exists(location: string, expectedChecksum?: string): RepositoryResult<boolean>;
}

function bodyFor(payload: unknown) {
  const body = JSON.stringify(payload);
  if (body === undefined) throw new Error("Artifact payload must be JSON serializable");
  return body;
}

function checksum(body: string) {
  return createHash("sha256").update(body, "utf8").digest("hex");
}

function safeKey(key: string) {
  const normalized = key.trim().replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  if (!normalized) throw new Error("Artifact key must contain a safe filename");
  return normalized.slice(0, 160);
}

type MemoryArtifact = ArtifactRecord & { body: string };

export class InMemoryArtifactStore implements ArtifactStore {
  private readonly artifacts = new Map<string, MemoryArtifact>();

  putJson(key: string, payload: unknown) {
    const normalizedKey = safeKey(key);
    const body = bodyFor(payload);
    const record: MemoryArtifact = {
      location: `memory-artifact://${normalizedKey}`,
      checksum: checksum(body),
      bytes: Buffer.byteLength(body, "utf8"),
      body,
    };
    const existing = this.artifacts.get(record.location);
    if (existing) {
      if (existing.checksum !== record.checksum) {
        throw new Error(`Artifact key already exists with a different payload: ${normalizedKey}`);
      }
      return {
        location: existing.location,
        checksum: existing.checksum,
        bytes: existing.bytes,
      };
    }
    this.artifacts.set(record.location, record);
    return {
      location: record.location,
      checksum: record.checksum,
      bytes: record.bytes,
    };
  }

  readJson<T>(location: string, expectedChecksum?: string) {
    const artifact = this.artifacts.get(location);
    if (!artifact) return undefined;
    if (expectedChecksum && artifact.checksum !== expectedChecksum) {
      throw new Error(`Artifact checksum mismatch: ${location}`);
    }
    return JSON.parse(artifact.body) as T;
  }

  exists(location: string, expectedChecksum?: string) {
    return this.readJson<unknown>(location, expectedChecksum) !== undefined;
  }
}

export class FileArtifactStore implements ArtifactStore {
  private readonly rootDirectory: string;

  constructor(rootDirectory = process.env.AGRI_ARTIFACT_DIR?.trim() || path.resolve(process.cwd(), ".data", "artifacts")) {
    this.rootDirectory = path.resolve(rootDirectory);
  }

  async putJson(key: string, payload: unknown) {
    const normalizedKey = safeKey(key);
    const body = bodyFor(payload);
    const digest = checksum(body);
    const fileName = `${normalizedKey}.json`;
    const filePath = this.resolveFile(`file-artifact://${fileName}`);
    await mkdir(this.rootDirectory, { recursive: true });
    try {
      await writeFile(filePath, body, { encoding: "utf8", flag: "wx" });
    } catch (error) {
      if (!isAlreadyExists(error)) throw error;
      const existing = await readFile(filePath, "utf8");
      if (checksum(existing) !== digest) {
        throw new Error(`Artifact key already exists with a different payload: ${normalizedKey}`);
      }
    }
    return {
      location: `file-artifact://${fileName}`,
      checksum: digest,
      bytes: Buffer.byteLength(body, "utf8"),
    } satisfies ArtifactRecord;
  }

  async readJson<T>(location: string, expectedChecksum?: string) {
    const filePath = this.resolveFile(location);
    let body: string;
    try {
      body = await readFile(filePath, "utf8");
    } catch (error) {
      if (isMissing(error)) return undefined;
      throw error;
    }
    if (expectedChecksum && checksum(body) !== expectedChecksum) {
      throw new Error(`Artifact checksum mismatch: ${location}`);
    }
    return JSON.parse(body) as T;
  }

  async exists(location: string, expectedChecksum?: string) {
    try {
      const filePath = this.resolveFile(location);
      const details = await stat(filePath);
      if (!details.isFile()) return false;
      if (expectedChecksum) {
        await this.readJson(location, expectedChecksum);
      }
      return true;
    } catch (error) {
      if (isMissing(error)) return false;
      throw error;
    }
  }

  private resolveFile(location: string) {
    const prefix = "file-artifact://";
    if (!location.startsWith(prefix)) throw new Error("Unsupported artifact location");
    const fileName = location.slice(prefix.length);
    if (!/^[a-zA-Z0-9._-]+\.json$/.test(fileName)) throw new Error("Unsafe artifact location");
    const target = path.resolve(this.rootDirectory, fileName);
    if (path.dirname(target) !== this.rootDirectory) throw new Error("Artifact path escapes storage root");
    return target;
  }
}

function isMissing(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "ENOENT";
}

function isAlreadyExists(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "EEXIST";
}

type ArtifactGlobalState = typeof globalThis & { __agriArtifactStore?: ArtifactStore };
const artifactGlobalState = globalThis as ArtifactGlobalState;
const useFilesystem = process.env.AGRI_ARTIFACT_STORAGE?.trim().toLowerCase() === "filesystem";

export const artifactStore: ArtifactStore =
  artifactGlobalState.__agriArtifactStore ??
  (artifactGlobalState.__agriArtifactStore = useFilesystem
    ? new FileArtifactStore()
    : new InMemoryArtifactStore());
