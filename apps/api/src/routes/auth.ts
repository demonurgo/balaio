import type { FastifyInstance } from "fastify";
import { hashPassword, verifyPassword } from "../auth/password.js";
import type { AuthRepository, AuthUserRecord } from "../auth/repository.js";
import { loginSchema, profileUpdateSchema, registerSchema, toFieldErrors } from "../auth/schemas.js";
import { clearSessionCookie, getSessionUserId, setSessionCookie } from "../auth/session.js";

function toPublicUser(user: AuthUserRecord) {
  return {
    id: user.id,
    name: user.name,
    firstName: user.firstName,
    lastName: user.lastName,
    birthDate: user.birthDate,
    email: user.email
  };
}

function validationError(errors: Record<string, string>) {
  return {
    error: "ValidationError",
    message: "Revise os campos informados.",
    fields: errors
  };
}

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}

export async function registerAuthRoutes(app: FastifyInstance, repository: AuthRepository) {
  app.post(
    "/api/auth/register",
    {
      config: {
        rateLimit: {
          max: 3,
          timeWindow: "5 minutes"
        }
      }
    },
    async (request, reply) => {
      const parsed = registerSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.code(400).send(validationError(toFieldErrors(parsed.error)));
      }

      const existing = await repository.findUserByEmail(parsed.data.email);

      if (existing) {
        return reply.code(409).send(
          validationError({
            email: "Nao foi possivel criar conta com este email."
          })
        );
      }

      try {
        const passwordHash = await hashPassword(parsed.data.password);
        const user = await repository.createUser({
          firstName: parsed.data.firstName,
          lastName: parsed.data.lastName,
          birthDate: parsed.data.birthDate,
          email: parsed.data.email,
          passwordHash
        });

        setSessionCookie(app, reply, user.id);

        return reply.code(201).send({
          user: toPublicUser(user)
        });
      } catch (error) {
        if (isUniqueViolation(error)) {
          return reply.code(409).send(
            validationError({
              email: "Nao foi possivel criar conta com este email."
            })
          );
        }

        throw error;
      }
    }
  );

  app.post(
    "/api/auth/login",
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: "1 minute"
        }
      }
    },
    async (request, reply) => {
      const parsed = loginSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.code(400).send(validationError(toFieldErrors(parsed.error)));
      }

      const user = await repository.findUserByEmail(parsed.data.email);
      const validPassword = user ? await verifyPassword(user.passwordHash, parsed.data.password) : false;

      if (!user || !validPassword) {
        return reply.code(401).send({
          error: "InvalidCredentials",
          message: "Email ou senha invalidos."
        });
      }

      setSessionCookie(app, reply, user.id);

      return {
        user: toPublicUser(user)
      };
    }
  );

  app.post("/api/auth/logout", async (_request, reply) => {
    clearSessionCookie(reply);

    return {
      ok: true
    };
  });

  app.get("/api/auth/me", async (request, reply) => {
    const userId = await getSessionUserId(app, request);

    if (!userId) {
      return reply.code(401).send({
        error: "Unauthenticated",
        message: "Sessao expirada."
      });
    }

    const user = await repository.findUserById(userId);

    if (!user) {
      clearSessionCookie(reply);

      return reply.code(401).send({
        error: "Unauthenticated",
        message: "Sessao expirada."
      });
    }

    return {
      user: toPublicUser(user)
    };
  });

  app.patch("/api/auth/me", async (request, reply) => {
    const userId = await getSessionUserId(app, request);

    if (!userId) {
      return reply.code(401).send({
        error: "Unauthenticated",
        message: "Sessao expirada."
      });
    }

    const parsed = profileUpdateSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send(validationError(toFieldErrors(parsed.error)));
    }

    const existing = await repository.findUserByEmail(parsed.data.email);

    if (existing && existing.id !== userId) {
      return reply.code(409).send(
        validationError({
          email: "Este email ja esta em uso."
        })
      );
    }

    try {
      const user = await repository.updateUser(userId, parsed.data);

      if (!user) {
        clearSessionCookie(reply);

        return reply.code(401).send({
          error: "Unauthenticated",
          message: "Sessao expirada."
        });
      }

      return {
        user: toPublicUser(user)
      };
    } catch (error) {
      if (isUniqueViolation(error)) {
        return reply.code(409).send(
          validationError({
            email: "Este email ja esta em uso."
          })
        );
      }

      throw error;
    }
  });
}
