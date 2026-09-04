import { randomBytes } from "node:crypto";

import type { UserRole } from "@/lib/domain/types";
import {
  AuthRepositoryError,
  hashPassword,
  SESSION_TTL_SECONDS,
  verifyPassword,
} from "@/lib/repositories/authCore";
import type { AuthUser } from "@/lib/repositories/authCore";
import { getDatabasePool } from "@/db/client";
import { PostgresAuthRepository } from "@/lib/repositories/postgresAuthRepository";
import type { RepositoryResult } from "@/lib/repositories/types";
import { isPostgresPersistenceEnabled } from "@/lib/repositories/runtime";

export { AuthRepositoryError, hashPassword, SESSION_TTL_SECONDS, verifyPassword } from "@/lib/repositories/authCore";
export type { AuthUser } from "@/lib/repositories/authCore";

type StoredUser = AuthUser & {
  passwordHash: string;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function publicUser(user: StoredUser): AuthUser {
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
}

export interface AuthRepository {
  register(input: {
    fullName: string;
    email: string;
    password: string;
    role?: UserRole;
  }): RepositoryResult<{ user: AuthUser; sessionToken: string }>;
  authenticate(email: string, password: string): RepositoryResult<{
    user: AuthUser;
    sessionToken: string;
  }>;
  findBySessionToken(token: string): RepositoryResult<AuthUser | undefined>;
  findById(id: string): RepositoryResult<AuthUser | undefined>;
  findByIdIncludingInactive(id: string): RepositoryResult<AuthUser | undefined>;
  updateProfile(
    id: string,
    input: {
      fullName?: string;
      email?: string;
      currentPassword?: string;
      newPassword?: string;
    },
  ): RepositoryResult<AuthUser>;
  listUsers(query?: string, options?: { includeInactive?: boolean }): RepositoryResult<readonly AuthUser[]>;
  updateRole(id: string, role: UserRole): RepositoryResult<AuthUser>;
  updateActive(id: string, active: boolean): RepositoryResult<AuthUser>;
  revokeSession(token: string): RepositoryResult<void>;
}

export class InMemoryAuthRepository implements AuthRepository {
  private readonly usersByEmail = new Map<string, StoredUser>();
  private readonly usersById = new Map<string, StoredUser>();
  private readonly sessions = new Map<string, { userId: string; expiresAt: number }>();

  constructor(private readonly sessionTtlSeconds = SESSION_TTL_SECONDS) {}

  register({ fullName, email, password, role = "USER" }: {
    fullName: string;
    email: string;
    password: string;
    role?: UserRole;
  }) {
    const normalizedEmail = normalizeEmail(email);
    if (this.usersByEmail.has(normalizedEmail)) {
      throw new AuthRepositoryError("Email already exists", "EMAIL_EXISTS");
    }

    const user: StoredUser = {
      id: `user-${randomBytes(8).toString("hex")}`,
      fullName: fullName.trim(),
      email: normalizedEmail,
      role,
      active: true,
      createdAt: new Date().toISOString(),
      passwordHash: hashPassword(password),
    };
    this.usersByEmail.set(normalizedEmail, user);
    this.usersById.set(user.id, user);

    return { user: publicUser(user), sessionToken: this.createSession(user.id) };
  }

  authenticate(email: string, password: string) {
    const user = this.usersByEmail.get(normalizeEmail(email));
    if (!user || !user.active || !verifyPassword(password, user.passwordHash)) {
      throw new AuthRepositoryError(
        "Invalid email or password",
        "INVALID_CREDENTIALS",
      );
    }

    return { user: publicUser(user), sessionToken: this.createSession(user.id) };
  }

  findBySessionToken(token: string) {
    const session = this.sessions.get(token);
    if (!session) return undefined;
    if (session.expiresAt <= Date.now()) {
      this.sessions.delete(token);
      return undefined;
    }
    const user = this.usersById.get(session.userId);
    return user?.active ? publicUser(user) : undefined;
  }

  findById(id: string) {
    const user = this.usersById.get(id);
    return user?.active ? publicUser(user) : undefined;
  }

  findByIdIncludingInactive(id: string) {
    const user = this.usersById.get(id);
    return user ? publicUser(user) : undefined;
  }

  updateProfile(id: string, input: {
    fullName?: string;
    email?: string;
    currentPassword?: string;
    newPassword?: string;
  }) {
    const user = this.usersById.get(id);
    if (!user) throw new AuthRepositoryError("User not found", "NOT_FOUND");

    if (input.newPassword !== undefined &&
        (!input.currentPassword || !verifyPassword(input.currentPassword, user.passwordHash))) {
      throw new AuthRepositoryError("Current password is invalid", "INVALID_PASSWORD");
    }

    const nextEmail = input.email ? normalizeEmail(input.email) : user.email;
    const existing = this.usersByEmail.get(nextEmail);
    if (existing && existing.id !== id) {
      throw new AuthRepositoryError("Email already exists", "EMAIL_EXISTS");
    }

    if (nextEmail !== user.email) {
      this.usersByEmail.delete(user.email);
      this.usersByEmail.set(nextEmail, user);
    }
    if (input.fullName !== undefined) user.fullName = input.fullName.trim();
    user.email = nextEmail;
    if (input.newPassword !== undefined) user.passwordHash = hashPassword(input.newPassword);
    return publicUser(user);
  }

  listUsers(query?: string, options: { includeInactive?: boolean } = {}) {
    const normalizedQuery = query?.trim().toLowerCase();
    return [...this.usersById.values()]
      .filter((user) => options.includeInactive || user.active)
      .filter((user) => !normalizedQuery ||
        user.email.includes(normalizedQuery) ||
        user.fullName.toLowerCase().includes(normalizedQuery))
      .map(publicUser);
  }

  updateRole(id: string, role: UserRole) {
    const user = this.usersById.get(id);
    if (!user) throw new AuthRepositoryError("User not found", "NOT_FOUND");
    user.role = role;
    return publicUser(user);
  }

  updateActive(id: string, active: boolean) {
    const user = this.usersById.get(id);
    if (!user) throw new AuthRepositoryError("User not found", "NOT_FOUND");
    user.active = active;
    if (!active) {
      for (const [token, session] of this.sessions) {
        if (session.userId === id) this.sessions.delete(token);
      }
    }
    return publicUser(user);
  }

  revokeSession(token: string) {
    this.sessions.delete(token);
  }

  private createSession(userId: string) {
    const token = randomBytes(32).toString("base64url");
    this.sessions.set(token, {
      userId,
      expiresAt: Date.now() + Math.max(0, this.sessionTtlSeconds) * 1000,
    });
    return token;
  }
}

type AuthGlobalState = typeof globalThis & {
  __agriAuthRepository?: AuthRepository;
};

const authGlobalState = globalThis as AuthGlobalState;
const usePostgres = isPostgresPersistenceEnabled();
export const authRepository: AuthRepository =
  authGlobalState.__agriAuthRepository ??
  (authGlobalState.__agriAuthRepository = usePostgres
    ? new PostgresAuthRepository(getDatabasePool())
    : new InMemoryAuthRepository());

if (
  !usePostgres &&
  process.env.NODE_ENV !== "production" &&
  process.env.DEV_ADMIN_EMAIL &&
  process.env.DEV_ADMIN_PASSWORD
) {
  const devAdminEmail = process.env.DEV_ADMIN_EMAIL;
  const devAdminPassword = process.env.DEV_ADMIN_PASSWORD;
  void (async () => {
    const existingAdmin = (await authRepository.listUsers()).find(
      (user) => user.email === devAdminEmail.trim().toLowerCase(),
    );
    if (!existingAdmin) {
      await authRepository.register({
        fullName: "Development Admin",
        email: devAdminEmail,
        password: devAdminPassword,
        role: "ADMIN",
      });
    }
  })();
}
