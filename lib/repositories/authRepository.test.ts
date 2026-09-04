import { describe, expect, it } from "vitest";

import {
  AuthRepositoryError,
  InMemoryAuthRepository,
} from "@/lib/repositories/authRepository";

describe("in-memory auth repository", () => {
  it("hashes credentials and resolves a server-side session", () => {
    const repository = new InMemoryAuthRepository();
    const registered = repository.register({
      fullName: "Test User",
      email: "test@example.com",
      password: "password123",
    });

    expect(registered.user.email).toBe("test@example.com");
    expect("passwordHash" in registered.user).toBe(false);
    expect(repository.findBySessionToken(registered.sessionToken)).toEqual(
      registered.user,
    );
    expect(repository.authenticate("test@example.com", "password123").user).toEqual(
      registered.user,
    );
  });

  it("rejects duplicate and invalid credentials", () => {
    const repository = new InMemoryAuthRepository();
    repository.register({
      fullName: "Test User",
      email: "test@example.com",
      password: "password123",
    });

    expect(() =>
      repository.register({
        fullName: "Other User",
        email: "TEST@example.com",
        password: "password123",
      }),
    ).toThrowError(AuthRepositoryError);
    expect(() => repository.authenticate("test@example.com", "wrongpass")).toThrow(
      "Invalid email or password",
    );
  });

  it("supports bounded user search without exposing password hashes", () => {
    const repository = new InMemoryAuthRepository();
    repository.register({
      fullName: "Officer Example",
      email: "officer@example.com",
      password: "password123",
    });
    repository.register({
      fullName: "Another User",
      email: "another@example.com",
      password: "password123",
    });

    expect(repository.listUsers("officer")).toHaveLength(1);
    expect(repository.listUsers("officer")[0]).not.toHaveProperty("passwordHash");
  });

  it("expires sessions and removes them from the session store", () => {
    const repository = new InMemoryAuthRepository(0);
    const registered = repository.register({
      fullName: "Expired User",
      email: "expired@example.com",
      password: "password123",
    });

    expect(repository.findBySessionToken(registered.sessionToken)).toBeUndefined();
    expect(repository.findBySessionToken(registered.sessionToken)).toBeUndefined();
  });

  it("revokes active sessions when a user is deactivated", () => {
    const repository = new InMemoryAuthRepository();
    const registered = repository.register({
      fullName: "Managed User",
      email: "managed@example.com",
      password: "password123",
    });

    const updated = repository.updateActive(registered.user.id, false);
    expect(updated.active).toBe(false);
    expect(repository.findBySessionToken(registered.sessionToken)).toBeUndefined();
    expect(repository.findById(registered.user.id)).toBeUndefined();
    expect(repository.findByIdIncludingInactive(registered.user.id)).toMatchObject({
      id: registered.user.id,
      active: false,
    });
  });
});
