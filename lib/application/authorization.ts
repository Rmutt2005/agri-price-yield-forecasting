import type { UserRole } from "@/lib/domain/types";

export type Permission =
  | "profile:read"
  | "profile:update"
  | "analysis:create"
  | "analysis:read"
  | "ingestion:manage"
  | "dataset:manage"
  | "model:manage"
  | "user:search"
  | "user:status"
  | "user:manage"
  | "system-status:manage";

const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  USER: ["profile:read", "profile:update", "analysis:create", "analysis:read"],
  OFFICER: [
    "profile:read",
    "profile:update",
    "analysis:create",
    "analysis:read",
    "ingestion:manage",
    "dataset:manage",
    "model:manage",
    "user:search",
    "user:status",
  ],
  ADMIN: [
    "profile:read",
    "profile:update",
    "analysis:create",
    "analysis:read",
    "ingestion:manage",
    "dataset:manage",
    "model:manage",
    "user:search",
    "user:status",
    "user:manage",
    "system-status:manage",
  ],
};

export function hasPermission(role: UserRole, permission: Permission) {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function permissionsForRole(role: UserRole) {
  return ROLE_PERMISSIONS[role];
}
