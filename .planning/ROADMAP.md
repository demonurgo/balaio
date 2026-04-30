# Roadmap: Balaio

**Created:** 2026-04-30
**Granularity:** Coarse

## Phase Summary

| # | Phase | Goal | Requirements | UI hint |
|---|-------|------|--------------|---------|
| 1 | Foundation | Establish project skeleton, PWA shell, API shell, database schema, assets | FOUND-01..FOUND-05 | yes |
| 2 | Authentication | Add account/session flow with secure password auth | AUTH-01..AUTH-04 | yes |
| 3 | Monthly Feiras | Create, list, open, budget, and import monthly feiras | FAIR-01..FAIR-05 | yes |
| 4 | Items And Budget | Build item CRUD, purchased state, totals, and budget math | ITEM-01..ITEM-06 | yes |
| 5 | Sharing And Permissions | Invite users, manage roles, enforce access server-side | SHARE-01..SHARE-05 | yes |
| 6 | Realtime Collaboration | Wire Socket.IO rooms, events, presence, and conflict-safe UI updates | REAL-01..REAL-05 | yes |
| 7 | Polish And Release | Finish responsive UI states, PWA behavior, tests, and release readiness | UI-01..UI-05 | yes |
| 8 | Auth Simples Login Cadastro | Build simple email/password register, login, session, logout, validation, and tests | AUTH-01..AUTH-04 | yes |

## Phase Details

## Phase 1: Foundation

**Goal:** Establish the application architecture and brand-ready shell.

**Requirements:** FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05

**Success Criteria:**

1. Monorepo has `apps/web`, `apps/api`, and `packages/shared`.
2. Web app builds as a Vite React PWA.
3. API starts as a Fastify service and exposes `/health`.
4. Drizzle schema defines users, feiras, members, items, and templates.
5. Balaio logo/PWA assets are present in web public assets.

**UI hint:** yes

## Phase 2: Authentication

**Goal:** Let users securely create accounts and maintain sessions.

**Requirements:** AUTH-01, AUTH-02, AUTH-03, AUTH-04

**Success Criteria:**

1. User can sign up with email/password.
2. User can log in and stay logged in after refresh.
3. User can log out from the app shell.
4. Passwords are hashed and never returned by API.

**UI hint:** yes

## Phase 3: Monthly Feiras

**Goal:** Let users manage feira containers by month.

**Requirements:** FAIR-01, FAIR-02, FAIR-03, FAIR-04, FAIR-05

**Success Criteria:**

1. User can create a feira for a month/year with budget.
2. User can browse feiras by month/year.
3. User can open a feira and see its current state.
4. User can import items from a previous month.
5. Budget edits persist and update summary values.

**UI hint:** yes

## Phase 4: Items And Budget

**Goal:** Make the shopping list useful for real feira work.

**Requirements:** ITEM-01, ITEM-02, ITEM-03, ITEM-04, ITEM-05, ITEM-06

**Success Criteria:**

1. User can add, edit, and delete items.
2. User can set quantity, unit, unit price, category, and notes.
3. User can mark items purchased/pending.
4. Item totals and feira totals calculate correctly.
5. Budget remaining and percent used update immediately.

**UI hint:** yes

## Phase 5: Sharing And Permissions

**Goal:** Allow safe collaboration around one feira.

**Requirements:** SHARE-01, SHARE-02, SHARE-03, SHARE-04, SHARE-05

**Success Criteria:**

1. Owner can invite another registered user.
2. Roles control owner/editor/viewer behavior.
3. Editor can change items; viewer cannot.
4. API rejects unauthorized access and edits.
5. UI reflects member role and available actions.

**UI hint:** yes

## Phase 6: Realtime Collaboration

**Goal:** Make shared feiras feel live.

**Requirements:** REAL-01, REAL-02, REAL-03, REAL-04, REAL-05

**Success Criteria:**

1. Client joins the opened feira room.
2. Item and budget changes broadcast to all room members.
3. UI updates rows/totals from realtime events.
4. Presence indicators show online/editing/viewing status.
5. Realtime updates do not duplicate items or show stale totals.

**UI hint:** yes

## Phase 7: Polish And Release

**Goal:** Make Balaio feel fast, installable, and ready for daily use.

**Requirements:** UI-01, UI-02, UI-03, UI-04, UI-05

**Success Criteria:**

1. Light/dark themes match Balaio palette.
2. Mobile and desktop layouts avoid overlap and horizontal traps.
3. Loading, empty, and error states exist.
4. PWA manifest/icons install correctly.
5. Core flows have focused tests and manual verification notes.

**UI hint:** yes

## Coverage

All 35 v1 requirements map to exactly one phase.

### Phase 8: Autenticacao simples com cadastro, login, validacoes e testes

**Goal:** Criar autenticacao funcional e segura para cadastro, login, sessao persistente e logout, sem Google OAuth e sem fluxo de esqueci senha nesta fase.
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04
**Depends on:** Phase 7
**Plans:** 2/2 plans complete

Plans:
- [x] 08-01 API auth, banco, sessoes, rate limit e testes
- [x] 08-02 Tela de login/cadastro, validacoes inline e integracao

---
*Last updated: 2026-04-30 after planning Phase 8*
