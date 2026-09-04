import { NextResponse } from "next/server";

import { hasPermission } from "@/lib/application/authorization";
import { DatasetFileParseError, parseDatasetFile } from "@/lib/application/datasetParser";
import { MAX_DATASET_NAME_LENGTH, validateDatasetRows } from "@/lib/application/datasetService";
import type { DataOrigin, TrainingDataset } from "@/lib/domain/types";
import { datasetRepository } from "@/lib/repositories/datasetRepository";
import { artifactStore } from "@/lib/repositories/artifactStore";
import { userFromRequest } from "@/lib/server/session";

const MAX_DATASET_PAYLOAD_BYTES = 2_000_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDataOrigin(value: unknown): value is DataOrigin {
  return value === "ACTUAL" || value === "IMPUTED" || value === "SYNTHETIC";
}

function publicDataset(dataset: TrainingDataset) {
  const { rows: _rows, ...summary } = dataset;
  return summary;
}

function isUploadFile(value: FormDataEntryValue | null): value is File {
  return Boolean(
    value &&
      typeof value === "object" &&
      "name" in value &&
      "size" in value &&
      "text" in value &&
      typeof (value as File).text === "function",
  );
}

function parseMapping(value: FormDataEntryValue | null) {
  if (value === null || typeof value !== "string" || !value.trim()) return undefined;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    throw new DatasetFileParseError("columnMapping ต้องเป็น JSON ที่ถูกต้อง", "INVALID_FILE");
  }
}

export async function GET(request: Request) {
  const user = await userFromRequest(request);
  if (!user) {
    return NextResponse.json(
      { error: "UNAUTHENTICATED", message: "กรุณาเข้าสู่ระบบ" },
      { status: 401 },
    );
  }
  if (!hasPermission(user.role, "dataset:manage")) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "ไม่มีสิทธิ์ดู dataset" },
      { status: 403 },
    );
  }
  return NextResponse.json({ data: (await datasetRepository.list()).map(publicDataset) });
}

export async function POST(request: Request) {
  const user = await userFromRequest(request);
  if (!user) {
    return NextResponse.json(
      { error: "UNAUTHENTICATED", message: "กรุณาเข้าสู่ระบบ" },
      { status: 401 },
    );
  }
  if (!hasPermission(user.role, "dataset:manage")) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "ไม่มีสิทธิ์ upload dataset" },
      { status: 403 },
    );
  }
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_DATASET_PAYLOAD_BYTES) {
    return NextResponse.json(
      { error: "PAYLOAD_TOO_LARGE", message: "dataset ต้องมีขนาดไม่เกิน 2 MB" },
      { status: 413 },
    );
  }

  let name: unknown;
  let rows: unknown;
  let columnMapping: unknown;
  let requestedDataOrigin: unknown;
  let sourceFileName: string | undefined;
  let sourceArtifactPayload: unknown;
  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (!isUploadFile(file)) {
        return NextResponse.json(
          { error: "VALIDATION_ERROR", issues: [{ row: 0, field: "file", message: "ต้องแนบไฟล์ CSV หรือ JSON" }] },
          { status: 400 },
        );
      }
      if (file.size > MAX_DATASET_PAYLOAD_BYTES) {
        return NextResponse.json(
          { error: "PAYLOAD_TOO_LARGE", message: "ไฟล์ dataset ต้องมีขนาดไม่เกิน 2 MB" },
          { status: 413 },
        );
      }
      const fileText = await file.text();
      const parsed = parseDatasetFile(file.name, fileText);
      sourceFileName = file.name;
      sourceArtifactPayload = { format: "file", fileName: file.name, content: fileText };
      name = form.get("name");
      rows = parsed.rows;
      columnMapping = parseMapping(form.get("columnMapping"));
      requestedDataOrigin = form.get("dataOrigin") ?? undefined;
    } else {
      const payload: unknown = await request.json();
      if (!isRecord(payload)) {
        return NextResponse.json(
          { error: "VALIDATION_ERROR", issues: [{ row: 0, field: "body", message: "ต้องเป็น object" }] },
          { status: 400 },
        );
      }
      name = payload.name;
      rows = payload.rows;
      columnMapping = payload.columnMapping;
      requestedDataOrigin = payload.dataOrigin;
      sourceArtifactPayload = { format: "json", payload };
    }
  } catch (error) {
    if (error instanceof DatasetFileParseError) {
      return NextResponse.json(
        { error: error.code, issues: [{ row: 0, field: "file", message: error.message }] },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "INVALID_JSON", message: "dataset body ต้องเป็น JSON ที่ถูกต้อง" },
      { status: 400 },
    );
  }
  if (typeof name !== "string" || !name.trim() || name.trim().length > MAX_DATASET_NAME_LENGTH) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", issues: [{ row: 0, field: "name", message: `ชื่อต้องมี 1-${MAX_DATASET_NAME_LENGTH} ตัวอักษร` }] },
      { status: 400 },
    );
  }
  const dataOrigin = isDataOrigin(requestedDataOrigin) ? requestedDataOrigin : "SYNTHETIC";
  const validation = await validateDatasetRows({
    rows,
    columnMapping,
    dataOrigin: requestedDataOrigin ?? dataOrigin,
  });
  const now = new Date().toISOString();
  const datasetKey = `dataset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  let sourceArtifact;
  try {
    sourceArtifact = await artifactStore.putJson(
      datasetKey,
      sourceArtifactPayload ?? { format: "json", rows },
    );
  } catch {
    return NextResponse.json(
      { error: "ARTIFACT_STORE_UNAVAILABLE", message: "ไม่สามารถจัดเก็บไฟล์ dataset ได้" },
      { status: 503 },
    );
  }
  const dataset: TrainingDataset = {
    id: datasetKey,
    datasetKey,
    version: "v1",
    name: name.trim(),
    uploadedBy: user.id,
    rows: validation.rows,
    report: validation.report,
    dataOrigin,
    status: validation.report.valid ? "VALIDATED" : "UPLOADED",
    createdAt: now,
    ...(sourceFileName ? { sourceFileName } : {}),
    artifactLocation: sourceArtifact.location,
    artifactChecksum: sourceArtifact.checksum,
  };
  const persistedDataset = await datasetRepository.save(dataset);
  return NextResponse.json(
    { dataset: publicDataset(persistedDataset) },
    { status: 201 },
  );
}
