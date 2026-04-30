# Phase 8: Auth simples login/cadastro - Context

**Gathered:** 2026-04-30
**Status:** Ready for planning
**Source:** User correction after initial Phase 8 scope

<domain>
## Phase Boundary

Build functional email/password authentication for Balaio:

- Register account.
- Login.
- Persist session after refresh.
- Logout.
- Show a simple login/register screen.

Out of scope for this phase:

- Google OAuth.
- Forgot password.
- Password reset.
- Polished final visual design beyond matching current Balaio UI basics.

</domain>

<decisions>
## Locked Decisions

### Register Fields
- Register form fields: first name, last name, birth date, email, password, confirm password.
- Each invalid field must show a specific message.
- Password and confirm password fields must have standard eye visibility buttons.
- Confirm password must validate inline in real time and clearly show match/mismatch.

### Login Fields
- Login form fields: email and password.
- Login form must not include "forgot password" in this phase.
- Login form must not include Google/OAuth buttons.

### Security
- Passwords must be hashed server-side before storage.
- Password hashes must never be returned by the API.
- Auth must use an HTTP-only cookie session/JWT, not localStorage token storage.
- Login/register endpoints must have rate limiting and timeout/429 behavior for repeated attempts.
- Login errors must be generic enough to avoid user enumeration.
- Register/form validation may show field-specific errors for malformed fields.

### UX Scope
- Functional first.
- Design refinement happens later.
- UI must still be minimal, calm, and consistent with current Balaio colors/fonts.

### the agent's Discretion
- Exact file split.
- Exact auth helper names.
- Exact rate-limit numbers, as long as they are conservative and tested.
- Whether tests are API-only or API + UI, as long as core validation and auth flows are covered.

</decisions>

<canonical_refs>
## Canonical References

Downstream agents MUST read:

- `.planning/PROJECT.md` - product intent, stack, constraints.
- `.planning/REQUIREMENTS.md` - AUTH-01..AUTH-04.
- `.planning/ROADMAP.md` - Phase 8 scope.
- `apps/api/src/db/schema.ts` - current user schema.
- `apps/api/src/index.ts` - Fastify registration pattern.
- `apps/web/src/App.tsx` - current app shell.
- `apps/web/src/index.css` - current Balaio styling.
- `apps/web/src/lib/api.ts` - current fetch helper.

</canonical_refs>

<specifics>
## Specific Requirements

- Register validation:
  - first name required, trimmed, reasonable max length.
  - last name required, trimmed, reasonable max length.
  - birth date required, valid date, not in future.
  - email required, valid format, normalized lowercase.
  - password required, minimum 8 characters, maximum 128 characters, all characters allowed.
  - confirm password required and must match password.
- Login validation:
  - email required and valid.
  - password required.
- Auth API:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `POST /api/auth/logout`
  - `GET /api/auth/me`
- UI:
  - screen can use two modes/tabs: Entrar / Criar conta.
  - on successful login/register, show current app shell.
  - on refresh, `GET /api/auth/me` restores session.

</specifics>

<deferred>
## Deferred Ideas

- Google OAuth.
- Forgot password / password reset.
- Email verification.
- Final auth visual polish.
- MFA.

</deferred>

---

*Phase: 08-auth-simples-login-cadastro*
*Context gathered: 2026-04-30*
