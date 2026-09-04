import { createHash } from "node:crypto";

import type { Pool } from "pg";
import { describe, expect, it, vi } from "vitest";

import { PostgresAuthRepository } from "@/lib/repositories/postgresAuthRepository";
import { AuthRepositoryError, hashPassword } from "@/lib/repositories/authCore";

type QueryResponse = {
  rows: Array<Record<string, unknown>>;
  rowCount?: number;
};

function userRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "6a2e1f1a-5b4f-4fd1-a7b1-7a8a8c8f0001",
    full_name: "Postgres User",
    email: "postgres@example.com",
    password_hash: hashPassword("password123"),
    role: "USER",
    active: true,
    created_at: new Date("2026-09-04T00:00:00.000Z"),
    ...overrides,
  };
}

function poolWithClient(clientQuery: ReturnType<typeof vi.fn>) {
  const client = {
    query: clientQuery,
    release: vi.fn(),
  };
  return {
    pool: {
      connect: vi.fn().mockResolvedValue(client),
      query: vi.fn(),
    } as unknown as Pool,
    client,
  };
}

describe("PostgresAuthRepository", () => {
  it("registers a user and stores only a hashed session token", async () => {
    const row = userRow();
    const clientQuery = vi.fn()
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } satisfies QueryResponse)
      .mockResolvedValueOnce({ rows: [row], rowCount: 1 } satisfies QueryResponse)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } satisfies QueryResponse)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } satisfies QueryResponse);
    const { pool, client } = poolWithClient(clientQuery);

    const result = await new PostgresAuthRepository(pool).register({
      fullName: " Postgres User ",
      email: "POSTGRES@EXAMPLE.COM",
      password: "password123",
    });

    expect(result.user).toEqual({
      id: row.id,
      fullName: row.full_name,
      email: row.email,
      role: row.role,
      active: row.active,
      createdAt: "2026-09-04T00:00:00.000Z",
    });
    expect("passwordHash" in result.user).toBe(false);
    expect(result.sessionToken).toHaveLength(43);
    expect(client.query).toHaveBeenNthCalledWith(1, "BEGIN");
    expect(client.query).toHaveBeenNthCalledWith(4, "COMMIT");

    const sessionCall = clientQuery.mock.calls[2] as [string, unknown[]];
    expect(sessionCall[0]).toContain("INSERT INTO auth_sessions");
    expect(sessionCall[0]).toContain("$1");
    expect(sessionCall[1][0]).toBe(
      createHash("sha256").update(result.sessionToken, "utf8").digest("hex"),
    );
    expect(sessionCall[1][0]).not.toBe(result.sessionToken);
    expect(sessionCall[1][1]).toBe(row.id);
  });

  it("maps a database unique violation to the public duplicate-email error", async () => {
    const duplicateError = Object.assign(new Error("duplicate key"), { code: "23505" });
    const clientQuery = vi.fn()
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } satisfies QueryResponse)
      .mockRejectedValueOnce(duplicateError)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } satisfies QueryResponse);
    const { pool, client } = poolWithClient(clientQuery);

    await expect(new PostgresAuthRepository(pool).register({
      fullName: "Duplicate User",
      email: "duplicate@example.com",
      password: "password123",
    })).rejects.toMatchObject({
      code: "EMAIL_EXISTS",
      name: "AuthRepositoryError",
    });
    expect(client.query).toHaveBeenNthCalledWith(1, "BEGIN");
    expect(client.query).toHaveBeenNthCalledWith(3, "ROLLBACK");
  });

  it("authenticates with the stored password hash and persists a session", async () => {
    const row = userRow();
    const databaseQuery = vi.fn()
      .mockResolvedValueOnce({ rows: [row], rowCount: 1 } satisfies QueryResponse)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } satisfies QueryResponse);
    const pool = {
      query: databaseQuery,
    } as unknown as Pool;

    const result = await new PostgresAuthRepository(pool).authenticate(
      "POSTGRES@EXAMPLE.COM",
      "password123",
    );

    expect(result.user.email).toBe("postgres@example.com");
    expect(databaseQuery).toHaveBeenCalledTimes(2);
    expect(databaseQuery.mock.calls[0]?.[1]).toEqual(["POSTGRES@EXAMPLE.COM"]);
    expect(databaseQuery.mock.calls[1]?.[0]).toContain("INSERT INTO auth_sessions");
  });

  it("deactivates a user and revokes sessions in one transaction", async () => {
    const row = userRow({ active: false });
    const clientQuery = vi.fn()
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } satisfies QueryResponse)
      .mockResolvedValueOnce({ rows: [row], rowCount: 1 } satisfies QueryResponse)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } satisfies QueryResponse)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } satisfies QueryResponse);
    const { pool, client } = poolWithClient(clientQuery);

    const result = await new PostgresAuthRepository(pool).updateActive(row.id as string, false);

    expect(result.active).toBe(false);
    expect(client.query).toHaveBeenNthCalledWith(3, "DELETE FROM auth_sessions WHERE user_id = $1", [row.id]);
    expect(client.query).toHaveBeenNthCalledWith(4, "COMMIT");
  });

  it("rejects invalid credentials without leaking whether the account exists", async () => {
    const databaseQuery = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 } satisfies QueryResponse);
    const pool = { query: databaseQuery } as unknown as Pool;

    await expect(new PostgresAuthRepository(pool).authenticate(
      "missing@example.com",
      "wrong-password",
    )).rejects.toEqual(expect.objectContaining({
      name: "AuthRepositoryError",
      code: "INVALID_CREDENTIALS",
    } satisfies Partial<AuthRepositoryError>));
  });
});
