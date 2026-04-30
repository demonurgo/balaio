# Phase 8: Auth simples login/cadastro - Research

**Date:** 2026-04-30
**Scope:** Email/password auth only. No Google OAuth. No forgot password.

## Findings

### Password Storage

Use `argon2` with Argon2id for password hashing. OWASP recommends Argon2id for password storage and notes common libraries handle salt generation internally. Do not store plaintext passwords. Do not return password hashes in API responses.

Source: OWASP Password Storage Cheat Sheet, `https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html`

### Password Rules

Avoid arbitrary composition rules. Use length-based validation, allow all characters, and give clear guidance. For Balaio v1: min 8, max 128, all characters allowed.

Source: OWASP Authentication Cheat Sheet, `https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html`

### Login Errors

Login failure should be generic: do not reveal whether email exists, password is wrong, or account is absent. Register can still show malformed field errors; duplicate email response should be phrased safely.

Source: OWASP Authentication Cheat Sheet, `https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html`

### Rate Limiting

NIST recommends limiting failed authentication attempts. For Balaio: route-level rate limit on `/api/auth/login` and `/api/auth/register`, returning HTTP 429 with retry message. Since app likely runs one VPS instance now, in-memory Fastify limiter is acceptable for v1; Redis/external store can come later if horizontal scaling appears.

Sources:
- NIST SP 800-63B, `https://pages.nist.gov/800-63-4/sp800-63b.html`
- `@fastify/rate-limit`, `https://github.com/fastify/fastify-rate-limit`

### Session Storage

Use HTTP-only cookies for auth token/session so frontend JavaScript cannot read the token. Current API already has `@fastify/jwt`; add `@fastify/cookie`. Cookie flags:

- `httpOnly: true`
- `sameSite: "lax"`
- `secure: true` in production
- path `/`
- max age 7 days

Source: `@fastify/cookie`, `https://github.com/fastify/fastify-cookie`

## Architecture

API additions:

- `apps/api/src/auth/password.ts`
- `apps/api/src/auth/schemas.ts`
- `apps/api/src/auth/session.ts`
- `apps/api/src/routes/auth.ts`
- Tests for validation, password helper, auth routes.

DB updates:

- `users.first_name`
- `users.last_name`
- `users.birth_date`
- `users.email`
- `users.password_hash`
- timestamps

Keep or remove old `name` depending on migration convenience. If keeping, derive it from first + last temporarily. Prefer future cleanup over risky migration churn.

Web additions:

- `apps/web/src/auth/AuthScreen.tsx`
- `apps/web/src/auth/validation.ts`
- `apps/web/src/auth/authApi.ts`
- `apps/web/src/state/useAuthStore.ts`
- Tests for validation and UI field behavior.

## Threat Model

Main risks:

- Brute force login.
- Password hash leakage.
- Token theft via XSS.
- User enumeration.
- Weak validation bypass.

Mitigations:

- Argon2id hashes.
- HTTP-only cookie.
- Generic login errors.
- Rate limit auth routes.
- Zod server validation.
- UI validation duplicated server-side, never trusted alone.

## Validation

Required checks:

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- API auth tests.
- Web auth validation/form tests.

## RESEARCH COMPLETE
