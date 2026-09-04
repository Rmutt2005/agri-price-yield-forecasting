import type { ValidationIssue } from "@/lib/domain/types";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function requiredString(
  payload: Record<string, unknown>,
  field: string,
  issues: ValidationIssue[],
) {
  const value = payload[field];
  if (typeof value !== "string" || value.trim().length === 0) {
    issues.push({ field, message: "ต้องกรอกข้อมูล" });
    return "";
  }
  return value.trim();
}

function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validateRegistration(payload: unknown) {
  const issues: ValidationIssue[] = [];
  if (!isRecord(payload)) {
    return { issues: [{ field: "body", message: "request body ต้องเป็น object" }] };
  }
  const fullName = requiredString(payload, "fullName", issues);
  const email = requiredString(payload, "email", issues).toLowerCase();
  const password = typeof payload.password === "string" ? payload.password : "";
  const confirmPassword =
    typeof payload.confirmPassword === "string" ? payload.confirmPassword : "";

  if (email && !validEmail(email)) {
    issues.push({ field: "email", message: "รูปแบบอีเมลไม่ถูกต้อง" });
  }
  if (password.length < 8) {
    issues.push({ field: "password", message: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" });
  }
  if (password !== confirmPassword) {
    issues.push({ field: "confirmPassword", message: "รหัสผ่านยืนยันไม่ตรงกัน" });
  }

  return issues.length > 0
    ? { issues }
    : { input: { fullName, email, password } };
}

export function validateLogin(payload: unknown) {
  const issues: ValidationIssue[] = [];
  if (!isRecord(payload)) {
    return { issues: [{ field: "body", message: "request body ต้องเป็น object" }] };
  }
  const email = requiredString(payload, "email", issues).toLowerCase();
  const password = requiredString(payload, "password", issues);
  if (email && !validEmail(email)) {
    issues.push({ field: "email", message: "รูปแบบอีเมลไม่ถูกต้อง" });
  }
  return issues.length > 0 ? { issues } : { input: { email, password } };
}

export function validateProfileUpdate(payload: unknown) {
  const issues: ValidationIssue[] = [];
  if (!isRecord(payload)) {
    return { issues: [{ field: "body", message: "request body ต้องเป็น object" }] };
  }
  const fullName = payload.fullName;
  const email = payload.email;
  if (fullName !== undefined && (typeof fullName !== "string" || !fullName.trim())) {
    issues.push({ field: "fullName", message: "ชื่อต้องไม่ว่าง" });
  }
  if (email !== undefined &&
      (typeof email !== "string" || !validEmail(email.trim()))) {
    issues.push({ field: "email", message: "รูปแบบอีเมลไม่ถูกต้อง" });
  }
  const currentPassword = payload.currentPassword;
  const newPassword = payload.newPassword;
  const confirmPassword = payload.confirmPassword;
  const changingPassword =
    currentPassword !== undefined || newPassword !== undefined || confirmPassword !== undefined;
  if (changingPassword &&
      (typeof currentPassword !== "string" || currentPassword.length === 0)) {
    issues.push({ field: "currentPassword", message: "ต้องกรอกรหัสผ่านเดิม" });
  }
  if (changingPassword && (typeof newPassword !== "string" || newPassword.length < 8)) {
    issues.push({ field: "newPassword", message: "รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร" });
  }
  if (changingPassword && newPassword !== confirmPassword) {
    issues.push({ field: "confirmPassword", message: "รหัสผ่านยืนยันไม่ตรงกัน" });
  }
  return issues.length > 0
    ? { issues }
    : {
        input: {
          fullName: typeof fullName === "string" ? fullName.trim() : undefined,
          email: typeof email === "string" ? email.trim().toLowerCase() : undefined,
          currentPassword: typeof currentPassword === "string" ? currentPassword : undefined,
          newPassword: typeof newPassword === "string" ? newPassword : undefined,
        },
      };
}
