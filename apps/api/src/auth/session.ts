import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { env } from "../env.js";

export type SessionPayload = {
  sub: string;
};

const DAY_IN_SECONDS = 24 * 60 * 60;

function signSessionToken(app: FastifyInstance, userId: string, days: number) {
  return app.jwt.sign({ sub: userId } satisfies SessionPayload, {
    expiresIn: `${days}d`
  });
}

export function setSessionCookie(app: FastifyInstance, reply: FastifyReply, userId: string) {
  const token = signSessionToken(app, userId, env.AUTH_SESSION_DAYS);

  reply.setCookie(env.AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: env.AUTH_SESSION_DAYS * DAY_IN_SECONDS
  });
}

/** Token for native apps, sent back as `Authorization: Bearer <token>`. */
export function createBearerToken(app: FastifyInstance, userId: string) {
  return signSessionToken(app, userId, env.AUTH_TOKEN_DAYS);
}

export function clearSessionCookie(reply: FastifyReply) {
  reply.clearCookie(env.AUTH_COOKIE_NAME, {
    path: "/"
  });
}

/** Returns the token of an `Authorization: Bearer <token>` header, if any. */
export function readBearerToken(authorization: string | undefined) {
  if (!authorization) {
    return null;
  }

  const match = /^Bearer\s+(\S+)\s*$/i.exec(authorization);
  return match?.[1] ?? null;
}

export function hasBearerToken(request: FastifyRequest) {
  return readBearerToken(request.headers.authorization) !== null;
}

export async function verifySessionToken(app: FastifyInstance, token: string) {
  try {
    const payload = await app.jwt.verify<SessionPayload>(token);
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

/**
 * Authenticates with `Authorization: Bearer` (native app) or the session
 * cookie (PWA). When an Authorization header is present the cookie is ignored.
 */
export async function getSessionUserId(app: FastifyInstance, request: FastifyRequest) {
  const authorization = request.headers.authorization;
  const token = authorization ? readBearerToken(authorization) : request.cookies[env.AUTH_COOKIE_NAME];

  if (!token) {
    return null;
  }

  return verifySessionToken(app, token);
}
