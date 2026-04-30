import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { hashPassword } from "../auth/password.js";
import type { AuthRepository, AuthUserRecord, CreateUserInput, UpdateUserInput } from "../auth/repository.js";
import { createApp } from "../app.js";

class MemoryAuthRepository implements AuthRepository {
  private users = new Map<string, AuthUserRecord>();

  async findUserByEmail(email: string) {
    return [...this.users.values()].find((user) => user.email === email) ?? null;
  }

  async findUserById(id: string) {
    return this.users.get(id) ?? null;
  }

  async createUser(input: CreateUserInput) {
    const user: AuthUserRecord = {
      id: randomUUID(),
      name: `${input.firstName} ${input.lastName}`.trim(),
      firstName: input.firstName,
      lastName: input.lastName,
      birthDate: input.birthDate,
      email: input.email,
      passwordHash: input.passwordHash
    };
    this.users.set(user.id, user);
    return user;
  }

  async updateUser(id: string, input: UpdateUserInput) {
    const current = this.users.get(id);

    if (!current) {
      return null;
    }

    const user: AuthUserRecord = {
      ...current,
      name: `${input.firstName} ${input.lastName}`.trim(),
      firstName: input.firstName,
      lastName: input.lastName,
      birthDate: input.birthDate,
      email: input.email
    };

    this.users.set(id, user);
    return user;
  }
}

describe("auth routes", () => {
  let app: FastifyInstance;
  let repository: MemoryAuthRepository;

  beforeEach(async () => {
    repository = new MemoryAuthRepository();
    app = (await createApp({ authRepository: repository })).app;
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it("returns field errors for invalid register input", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: {
        firstName: "",
        lastName: "",
        birthDate: "2999-01-01",
        email: "email-ruim",
        password: "123",
        confirmPassword: "456"
      }
    });

    const body = response.json();

    expect(response.statusCode).toBe(400);
    expect(body.fields.firstName).toBeTruthy();
    expect(body.fields.lastName).toBeTruthy();
    expect(body.fields.birthDate).toBeTruthy();
    expect(body.fields.email).toBeTruthy();
    expect(body.fields.password).toBeTruthy();
    expect(body.fields.confirmPassword).toBeTruthy();
  });

  it("registers user and sets an http-only cookie", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: {
        firstName: "Maria",
        lastName: "Alves",
        birthDate: "1990-05-10",
        email: "MARIA@example.com",
        password: "senha-segura",
        confirmPassword: "senha-segura"
      }
    });

    const body = response.json();
    const cookie = response.headers["set-cookie"];

    expect(response.statusCode).toBe(201);
    expect(body.user.email).toBe("maria@example.com");
    expect(body.user.passwordHash).toBeUndefined();
    expect(String(cookie)).toContain("HttpOnly");
  });

  it("logs in and returns generic error for bad credentials", async () => {
    await repository.createUser({
      firstName: "Joao",
      lastName: "Silva",
      birthDate: "1988-02-01",
      email: "joao@example.com",
      passwordHash: await hashPassword("senha-correta")
    });

    const badResponse = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: {
        email: "joao@example.com",
        password: "senha-errada"
      }
    });

    expect(badResponse.statusCode).toBe(401);
    expect(badResponse.json().message).toBe("Email ou senha invalidos.");

    const goodResponse = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: {
        email: "joao@example.com",
        password: "senha-correta"
      }
    });

    expect(goodResponse.statusCode).toBe(200);
    expect(String(goodResponse.headers["set-cookie"])).toContain("HttpOnly");
  });

  it("rate limits repeated login attempts", async () => {
    let response = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: {
        email: "ninguem@example.com",
        password: "qualquer-senha"
      }
    });

    for (let i = 0; i < 5; i += 1) {
      response = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: {
          email: "ninguem@example.com",
          password: "qualquer-senha"
        }
      });
    }

    expect(response.statusCode).toBe(429);
  });

  it("updates authenticated profile fields", async () => {
    const registerResponse = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: {
        firstName: "Maria",
        lastName: "Alves",
        birthDate: "1990-05-10",
        email: "maria@example.com",
        password: "senha-segura",
        confirmPassword: "senha-segura"
      }
    });
    const cookie = registerResponse.headers["set-cookie"];

    const updateResponse = await app.inject({
      method: "PATCH",
      url: "/api/auth/me",
      headers: {
        cookie: String(cookie)
      },
      payload: {
        firstName: "Ana",
        lastName: "Lima",
        birthDate: "1991-06-11",
        email: "ANA@example.com"
      }
    });
    const body = updateResponse.json();

    expect(updateResponse.statusCode).toBe(200);
    expect(body.user.name).toBe("Ana Lima");
    expect(body.user.email).toBe("ana@example.com");
    expect(body.user.birthDate).toBe("1991-06-11");
  });
});
