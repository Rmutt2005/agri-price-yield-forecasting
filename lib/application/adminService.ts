import type { SystemMode, UserRole, ValidationIssue } from "@/lib/domain/types";

const ROLES: readonly UserRole[] = ["USER", "OFFICER", "ADMIN"];
const MODES: readonly SystemMode[] = ["NORMAL", "MAINTENANCE"];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function validateRoleUpdate(payload: unknown) {
  const issues: ValidationIssue[] = [];
  const object = isRecord(payload) ? payload : {};
  if (!isRecord(payload) || !ROLES.includes(object.role as UserRole)) {
    issues.push({ field: "role", message: "role ไม่ถูกต้อง" });
  }
  return issues.length > 0
    ? { issues }
    : { role: object.role as UserRole };
}

export function validateUserStatusUpdate(payload: unknown) {
  const issues: ValidationIssue[] = [];
  const object = isRecord(payload) ? payload : {};
  if (!isRecord(payload) || typeof object.active !== "boolean") {
    issues.push({ field: "active", message: "active ต้องเป็น boolean" });
  }
  return issues.length > 0
    ? { issues }
    : { active: object.active as boolean };
}

export function validateSystemStatusUpdate(payload: unknown) {
  const issues: ValidationIssue[] = [];
  const object = isRecord(payload) ? payload : {};
  if (!isRecord(payload) || !MODES.includes(object.mode as SystemMode)) {
    issues.push({ field: "mode", message: "mode ต้องเป็น NORMAL หรือ MAINTENANCE" });
  }
  if (isRecord(payload) && object.message !== undefined && typeof object.message !== "string") {
    issues.push({ field: "message", message: "message ต้องเป็นข้อความ" });
  }
  return issues.length > 0
    ? { issues }
    : {
        mode: object.mode as SystemMode,
        message: typeof object.message === "string" ? object.message.trim() : undefined,
      };
}
