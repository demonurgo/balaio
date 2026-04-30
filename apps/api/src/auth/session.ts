import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { env } from "../env.js";

export type SessionPayload = {
  sub: string;
};

export function setSessionCookie(app: FastifyInstance, reply: FastifyReply, userId: string) {
  const token = app.jwt.sign(
    { sub: userId } satisfies SessionPayload,
    {
      expiresIn: `${env.AUTH_SESSION_DAYS}d`
    }
  );

  reply.setCookie(env.AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: env.AUTH_SESSION_DAYS * 24 * 60 * 60
  });
}

export function clearSessionCookie(reply: FastifyReply) {
  reply.clearCookie(env.AUTH_COOKIE_NAME, {
    path: "/"
  });
}

export async function getSessionUserId(app: FastifyInstance, request: FastifyRequest) {
  const token = request.cookies[env.AUTH_COOKIE_NAME];

  if (!token) {
    return null;
  }

  try {
    const payload = await app.jwt.verify<SessionPayload>(token);
    return payload.sub;
  } catch {
    return null;
  }
}
