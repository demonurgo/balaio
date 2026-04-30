# Requirements: Balaio

**Defined:** 2026-04-30
**Core Value:** Two people can manage the same monthly feira list together and trust that items, prices, purchased status, budget, and totals update immediately.

## v1 Requirements

### Foundation

- [ ] **FOUND-01**: Project has a working monorepo with web, api, and shared packages.
- [ ] **FOUND-02**: Web app runs as a Vite React PWA.
- [ ] **FOUND-03**: API runs as a Fastify TypeScript service.
- [ ] **FOUND-04**: PostgreSQL schema covers users, feiras, members, items, and product templates.
- [ ] **FOUND-05**: Balaio brand assets are available inside the web public assets.

### Authentication

- [ ] **AUTH-01**: User can create an account with email and password.
- [ ] **AUTH-02**: User can log in with email and password.
- [ ] **AUTH-03**: User session persists across browser refresh.
- [ ] **AUTH-04**: User can log out.

### Feiras

- [ ] **FAIR-01**: User can create a monthly feira with name, month, year, and budget.
- [ ] **FAIR-02**: User can view feiras grouped by month and year.
- [ ] **FAIR-03**: User can open a feira and see its item list.
- [ ] **FAIR-04**: User can import items from a previous feira into a new feira.
- [ ] **FAIR-05**: User can update feira budget.

### Items

- [ ] **ITEM-01**: User can add an item to a feira.
- [ ] **ITEM-02**: User can edit item name, quantity, unit, unit price, category, and notes.
- [ ] **ITEM-03**: User can delete an item from a feira.
- [ ] **ITEM-04**: User can mark an item as purchased or pending.
- [ ] **ITEM-05**: App calculates item total from quantity and unit price.
- [ ] **ITEM-06**: App calculates feira total, remaining budget, and percent used.

### Sharing

- [ ] **SHARE-01**: Owner can invite another registered user to a feira.
- [ ] **SHARE-02**: Owner can assign member role: owner, editor, or viewer.
- [ ] **SHARE-03**: Editor can change items and purchased status.
- [ ] **SHARE-04**: Viewer can only read feira data.
- [ ] **SHARE-05**: Backend rejects unauthorized access and edits.

### Realtime

- [ ] **REAL-01**: Client joins a Socket.IO room for the opened feira.
- [ ] **REAL-02**: Item create, update, delete, and purchased changes broadcast to all room members.
- [ ] **REAL-03**: Budget updates broadcast to all room members.
- [ ] **REAL-04**: UI shows small presence/status indicators for online users.
- [ ] **REAL-05**: UI reconciles realtime events without duplicating rows or stale totals.

### Interface

- [ ] **UI-01**: UI follows Balaio light and dark palettes.
- [ ] **UI-02**: UI uses Inter for app text and Caveat Brush only for brand contexts.
- [ ] **UI-03**: Mobile layout allows list, item status, totals, and add item actions without overlap.
- [ ] **UI-04**: Desktop layout shows feira list, opened feira, item table, budget, and realtime status.
- [ ] **UI-05**: Loading, empty, and error states exist for main screens.

## v2 Requirements

### Enhancements

- **V2-01**: User can create reusable product templates from frequently bought items.
- **V2-02**: App tracks product price history by month.
- **V2-03**: App compares month-over-month feira totals.
- **V2-04**: App supports family/group workspaces beyond one shared feira.
- **V2-05**: App supports push notifications for shared edits or budget warnings.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Offline mode | Online-only v1 avoids sync conflicts. |
| Native app store release | PWA covers first mobile target. |
| Supabase backend | Direct PostgreSQL backend is required. |
| Receipt scan/OCR | Useful later, not needed for v1 core loop. |
| Price marketplace | Product is about planning and collaboration first. |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 1 | Pending |
| FOUND-02 | Phase 1 | Pending |
| FOUND-03 | Phase 1 | Pending |
| FOUND-04 | Phase 1 | Pending |
| FOUND-05 | Phase 1 | Pending |
| AUTH-01 | Phase 2 | Pending |
| AUTH-02 | Phase 2 | Pending |
| AUTH-03 | Phase 2 | Pending |
| AUTH-04 | Phase 2 | Pending |
| FAIR-01 | Phase 3 | Pending |
| FAIR-02 | Phase 3 | Pending |
| FAIR-03 | Phase 3 | Pending |
| FAIR-04 | Phase 3 | Pending |
| FAIR-05 | Phase 3 | Pending |
| ITEM-01 | Phase 4 | Pending |
| ITEM-02 | Phase 4 | Pending |
| ITEM-03 | Phase 4 | Pending |
| ITEM-04 | Phase 4 | Pending |
| ITEM-05 | Phase 4 | Pending |
| ITEM-06 | Phase 4 | Pending |
| SHARE-01 | Phase 5 | Pending |
| SHARE-02 | Phase 5 | Pending |
| SHARE-03 | Phase 5 | Pending |
| SHARE-04 | Phase 5 | Pending |
| SHARE-05 | Phase 5 | Pending |
| REAL-01 | Phase 6 | Pending |
| REAL-02 | Phase 6 | Pending |
| REAL-03 | Phase 6 | Pending |
| REAL-04 | Phase 6 | Pending |
| REAL-05 | Phase 6 | Pending |
| UI-01 | Phase 7 | Pending |
| UI-02 | Phase 7 | Pending |
| UI-03 | Phase 7 | Pending |
| UI-04 | Phase 7 | Pending |
| UI-05 | Phase 7 | Pending |

**Coverage:**
- v1 requirements: 35 total
- Mapped to phases: 35
- Unmapped: 0

---
*Requirements defined: 2026-04-30*
*Last updated: 2026-04-30 after initialization*
