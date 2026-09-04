import { createHash, randomBytes } from "node:crypto";

import type { Pool, PoolClient, QueryResultRow } from "pg";

import { withTransaction } from "@/db/transaction";
import type { UserRole } from "@/lib/domain/types";
import type { AuthRepository } from "@/lib/repositories/authRepository";
import {
  AuthRepositoryError,
  SESSION_TTL_SECONDS,
  hashPassword,
  verifyPassword,
} from "@/lib/repositories/authCore";
import type { AuthUser } from "@/lib/repositories/authCore";

type UserRow = QueryResultRow & {
  id: string;
  full_name: string;
  email: string;
  password_hash?: string;
  role: UserRole;
  active: boolean;
  created_at: Date | string;
};

function toIso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toUser(row: UserRow): AuthUser {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    active: row.active,
    createdAt: toIso(row.created_at),
  };
}

function hashSessionToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error &&
    (error as { code?: string }).code === "23505";
}

const USER_COLUMNS = `
  id, full_name, email, role, active, created_at
`;

const USER_COLUMNS_WITH_PASSWORD = `
  id, full_name, email, password_hash, role, active, created_at
`;

const QUALIFIED_USER_COLUMNS = `
  u.id, u.full_name, u.email, u.role, u.active, u.created_at
`;

export class PostgresAuthRepository implements AuthRepository {
  constructor(private readonly database: Pool) {}

  async register({ fullName, email, password, role = "USER" }: {
    fullName: string;
    email: string;
    password: string;
    role?: UserRole;
  }) {
    const sessionToken = randomBytes(32).toString("base64url");
    try {
      return await withTransaction(this.database, async (client) => {
        const result = await client.query<UserRow>(
          `INSERT INTO users (full_name, email, password_hash, role)
           VALUES ($1, lower($2), $3, $4)
           RETURNING ${USER_COLUMNS_WITH_PASSWORD}`,
          [fullName.trim(), email.trim(), hashPassword(password), role],
        );
        const row = result.rows[0];
        if (!row) throw new Error("User insert returned no row");
        await this.insertSession(client, row.id, sessionToken);
        return { user: toUser(row), sessionToken };
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new AuthRepositoryError("Email already exists", "EMAIL_EXISTS");
      }
      throw error;
    }
  }

  async authenticate(email: string, password: string) {
    const result = await this.database.query<UserRow>(
      `SELECT ${USER_COLUMNS_WITH_PASSWORD} FROM users WHERE email = lower($1)`,
      [email.trim()],
    );
    const row = result.rows[0];
    if (!row || !row.active || !row.password_hash || !verifyPassword(password, row.password_hash)) {
      throw new AuthRepositoryError("Invalid email or password", "INVALID_CREDENTIALS");
    }
    const sessionToken = randomBytes(32).toString("base64url");
    await this.insertSession(this.database, row.id, sessionToken);
    return { user: toUser(row), sessionToken };
  }

  async findBySessionToken(token: string) {
    const result = await this.database.query<UserRow>(
      `SELECT ${QUALIFIED_USER_COLUMNS}
       FROM auth_sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = $1 AND s.expires_at > now() AND u.active = true`,
      [hashSessionToken(token)],
    );
    if (result.rows[0]) return toUser(result.rows[0]);
    await this.database.query(
      "DELETE FROM auth_sessions WHERE token_hash = $1 AND expires_at <= now()",
      [hashSessionToken(token)],
    );
    return undefined;
  }

  async findById(id: string) {
    const result = await this.database.query<UserRow>(
      `SELECT ${USER_COLUMNS} FROM users WHERE id = $1 AND active = true`,
      [id],
    );
    return result.rows[0] ? toUser(result.rows[0]) : undefined;
  }

  async findByIdIncludingInactive(id: string) {
    const result = await this.database.query<UserRow>(
      `SELECT ${USER_COLUMNS} FROM users WHERE id = $1`,
      [id],
    );
    return result.rows[0] ? toUser(result.rows[0]) : undefined;
  }

  async updateProfile(id: string, input: {
    fullName?: string;
    email?: string;
    currentPassword?: string;
    newPassword?: string;
  }) {
    const currentResult = await this.database.query<UserRow>(
      `SELECT ${USER_COLUMNS_WITH_PASSWORD} FROM users WHERE id = $1`,
      [id],
    );
    const current = currentResult.rows[0];
    if (!current) throw new AuthRepositoryError("User not found", "NOT_FOUND");
    if (input.newPassword !== undefined &&
        (!input.currentPassword || !current.password_hash ||
         !verifyPassword(input.currentPassword, current.password_hash))) {
      throw new AuthRepositoryError("Current password is invalid", "INVALID_PASSWORD");
    }
    try {
      const result = await this.database.query<UserRow>(
        `UPDATE users
         SET full_name = COALESCE($2, full_name),
             email = COALESCE(lower($3), email),
             password_hash = COALESCE($4, password_hash),
             updated_at = now()
         WHERE id = $1
         RETURNING ${USER_COLUMNS}`,
        [
          id,
          input.fullName?.trim() || null,
          input.email?.trim() || null,
          input.newPassword === undefined ? null : hashPassword(input.newPassword),
        ],
      );
      const row = result.rows[0];
      if (!row) throw new AuthRepositoryError("User not found", "NOT_FOUND");
      return toUser(row);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new AuthRepositoryError("Email already exists", "EMAIL_EXISTS");
      }
      throw error;
    }
  }

  async listUsers(query?: string, options: { includeInactive?: boolean } = {}) {
    const result = await this.database.query<UserRow>(
      `SELECT ${USER_COLUMNS}
       FROM users
       WHERE ($1::text IS NULL OR email ILIKE '%' || $1 || '%' OR full_name ILIKE '%' || $1 || '%')
         AND ($2::boolean = true OR active = true)
       ORDER BY created_at DESC`,
      [query?.trim() || null, options.includeInactive === true],
    );
    return result.rows.map(toUser);
  }

  async updateRole(id: string, role: UserRole) {
    const result = await this.database.query<UserRow>(
      `UPDATE users SET role = $2, updated_at = now() WHERE id = $1 RETURNING ${USER_COLUMNS}`,
      [id, role],
    );
    const row = result.rows[0];
    if (!row) throw new AuthRepositoryError("User not found", "NOT_FOUND");
    return toUser(row);
  }

  async updateActive(id: string, active: boolean) {
    return withTransaction(this.database, async (client) => {
      const result = await client.query<UserRow>(
        `UPDATE users SET active = $2, updated_at = now() WHERE id = $1 RETURNING ${USER_COLUMNS}`,
        [id, active],
      );
      const row = result.rows[0];
      if (!row) throw new AuthRepositoryError("User not found", "NOT_FOUND");
      if (!active) await client.query("DELETE FROM auth_sessions WHERE user_id = $1", [id]);
      return toUser(row);
    });
  }

  async revokeSession(token: string) {
    await this.database.query("DELETE FROM auth_sessions WHERE token_hash = $1", [hashSessionToken(token)]);
  }

  private async insertSession(database: Pick<Pool, "query"> | Pick<PoolClient, "query">, userId: string, token: string) {
    await database.query(
      `INSERT INTO auth_sessions (token_hash, user_id, expires_at)
       VALUES ($1, $2, now() + ($3 * interval '1 second'))`,
      [hashSessionToken(token), userId, SESSION_TTL_SECONDS],
    );
  }
}
