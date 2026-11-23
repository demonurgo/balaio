import type { FastifyInstance } from "fastify";

let counter = 0;

export type TestUser = {
  id: string;
  token: string;
  cookie: string;
  email: string;
  password: string;
};

export async function registerUser(app: FastifyInstance, firstName = "Pessoa"): Promise<TestUser> {
  counter += 1;
  const email = `${firstName.toLowerCase()}${counter}@example.com`;
  const password = "senha-segura";
  const response = await app.inject({
    method: "POST",
    url: "/api/auth/register",
    // Each user gets its own IP so the register rate limit does not interfere.
    remoteAddress: `10.0.0.${counter % 250}`,
    payload: {
      firstName,
      lastName: "Teste",
      birthDate: "1990-01-01",
      email,
      password,
      confirmPassword: password
    }
  });

  if (response.statusCode !== 201) {
    throw new Error(`register failed: ${response.statusCode} ${response.body}`);
  }

  const body = response.json();

  return {
    id: body.user.id,
    token: body.token,
    cookie: String(response.headers["set-cookie"]).split(";")[0] ?? "",
    email,
    password
  };
}

export function bearer(user: TestUser) {
  return { authorization: `Bearer ${user.token}` };
}
