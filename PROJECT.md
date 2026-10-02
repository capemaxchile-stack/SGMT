# Project: SGMT Technical & Functional Audit and Active Remediation

## Architecture
- **Backend**: NestJS 10, Prisma ORM, PostgreSQL 16, JWT Authentication, RBAC Guards, ACID Transactions.
- **Frontend**: React 19, Vite 5, Tailwind CSS v4, TanStack React Query, Lucide Icons.
- **Data Flow**:
  - Client sends authenticated JWT Bearer requests via Axios.
  - NestJS applies Global ValidationPipe -> JwtAuthGuard -> RolesGuard -> Controller -> Service -> Prisma Transactions (`$transaction` with PostgreSQL row locks).
  - AuditInterceptor records all critical mutations into immutable PostgreSQL `AuditLog`.
  - Frontend receives typed responses, updates local cache via QueryClient, and provides instant interactive visual feedback (toasts, loading skeletons, responsive tables).

## Code Layout
- `api/src/`: Backend NestJS application source.
  - `modules/auth/`: JWT strategies, login/refresh services, guards.
  - `modules/users/`: User management, credential handling, role assignments.
  - `modules/movements/`: Stock movements (Ingreso, Salida, Ajuste, Transferencia), Kardex, PMP calculation.
  - `modules/purchases/`: Purchase requests, purchase orders, reception workflow, approval thresholds.
  - `modules/audit/`: Audit log queries and event recording.
  - `common/`: Exception filters, guards, interceptors, decorators.
  - `prisma/`: Prisma schema, migrations, seed data.
- `web/src/`: Frontend React application source.
  - `components/layout/`: Header, Sidebar, mobile navigation drawers.
  - `components/ui/`: Toast notifications, Modal, DataTable, Badge, Button, Input.
  - `pages/`: Admin, Bodega, Compras, Faenas, Flota, Dashboard.
  - `api/`: TanStack Query hooks, Axios client, cache invalidations.
  - `types/`: Shared domain interfaces and DTO types.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | `SEC-CREDS` | Sanitize `findAllActive` to never expose `passwordHash` or `superKeyHash` | M1 | Survey 1 (SEC-001) |
| 2 | `SEC-AUDIT-REDACT` | Redact `superKey` and credentials from `AuditLog.detail` | M1 | Survey 1 (SEC-003) |
| 3 | `SEC-JWT-SECRETS` | Strict JWT secret validation at boot; separate `JWT_REFRESH_SECRET` | M1 | Survey 1 (SEC-004, SEC-005) |
| 4 | `SEC-AUTH-STATUS` | Enforce `isActive: true` validation on login and token refresh | M1 | Survey 1 (SEC-006) |
| 5 | `SEC-RBAC-HARDEN` | Fail-closed `RolesGuard` and enforce `@Roles` on `/users` and `/dashboard` | M1 | Survey 1 (SEC-007) |
| 6 | `SEC-AUDIT-IMMUTABLE` | PostgreSQL database rule/trigger preventing `UPDATE` or `DELETE` on `AuditLog` | M1 | Survey 1 (SEC-010) |
| 7 | `SEC-AUDIT-COVERAGE` | Add audit logging for authentication and state transitions | M1 | Survey 1 (SEC-011) |
| 8 | `SEC-DTO-VALIDATE` | Enforce `whitelist: true, forbidNonWhitelisted: true` and add missing DTOs | M1 | Survey 1 (SEC-013) |
| 9 | `LOGIC-STOCK-LOCK` | Row-level locking (`FOR UPDATE`) on Stock reads during movements and receptions | M2 | Survey 2 (R2-01) |
| 10 | `LOGIC-PMP-DECIMAL` | High-precision `Prisma.Decimal` PMP calculation; stamp active PMP on `SALIDA` | M2 | Survey 2 (R2-03) |
| 11 | `LOGIC-KARDEX-ISOLATE` | Warehouse-scoped Kardex queries; fix `AJUSTE` global balance overwrite | M2 | Survey 2 (R2-04) |
| 12 | `LOGIC-FOLIO-GEN` | Concurrency-safe folio generation for Movements and Purchase Orders | M2 | Survey 2 (R2-02) |
| 13 | `LOGIC-OC-FSM` | Strict finite state machine transition matrix on Purchase Orders | M2 | Survey 2 (R2-05) |
| 14 | `LOGIC-APPROVAL-LIMIT` | Enforce `Role.maxApprovalAmount` monetary approval thresholds | M2 | Survey 2 (R2-06) |
| 15 | `LOGIC-ST-WORKFLOW` | Field Requests lifecycle validation and conversion guards | M2 | Survey 2 (R2-07) |
| 16 | `LOGIC-SOFT-DELETE` | Implement soft-delete (`isActive: false`) on master entities | M2 | Survey 2 (R2-09) |
| 17 | `LOGIC-DB-FILTER` | Global `PrismaClientExceptionFilter` translating P2002/P2003/P2025 errors | M2 | Survey 2 (R2-10) |
| 18 | `UI-ESLINT-CONFIG` | Create `eslint.config.js` compatible with ESLint 9 to fix `npm run lint` | M3 | Survey 3 (Obs 2) |
| 19 | `UI-MOBILE-NAV` | Add responsive hamburger menu and mobile drawer in `Header.tsx` | M3 | Survey 3 (Obs 4) |
| 20 | `UI-TOAST-FEEDBACK` | Global interactive Toast notification provider and replace swallowed errors | M3 | Survey 3 (Obs 5) |
| 21 | `UI-TABLE-RESPONSIVE` | Add mobile horizontal scroll minimums (`min-w-[700px]`) and row skeletons | M3 | Survey 3 (Obs 6) |
| 22 | `UI-LAZY-ROUTES` | Implement `React.lazy()` route code-splitting to eliminate 549 kB chunk warning | M3 | Survey 3 (Obs 1) |
| 23 | `UI-MODAL-RESILIENCE` | Prevent accidental modal dismissal on backdrop click | M3 | Survey 3 (Obs 6) |
| 24 | `UI-TAILWIND-V4` | Clean up dead Tailwind v4 classes and align color tokens to `primary-*` | M3 | Survey 3 (Obs 3) |
| 25 | `UI-CACHE-SYNC` | Synchronize React Query cache invalidation key `['dashboard-metrics']` | M3 | Survey 3 (Obs 7) |
| 26 | `UI-KARDEX-TYPES` | Synchronize `KardexEntry` frontend interface with backend DTO | M3 | Survey 3 (Obs 8) |
| 27 | `SYS-COMPILATION` | Verify 100% clean compilation (`nest build` and `npx tsc -b`) | M4 | ORIGINAL_REQUEST §Acceptance |
| 28 | `SYS-E2E-ACCEPTANCE` | 100% Pass on Opaque-box E2E Tests (Tiers 1-4) & Adversarial Coverage (Tier 5) | M4 | ORIGINAL_REQUEST §Acceptance |
| 29 | `SYS-AUDIT-REPORT` | Consolidated Technical and Functional Audit & Remediation Report | M4 | ORIGINAL_REQUEST §Acceptance |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Backend Security & Architecture Hardening | Auth, JWT, credentials sanitization, RBAC, AuditLog immutability & DTO validation | none | DONE (Passed Gate: 2 Reviewers, 2 Challengers, 1 Auditor) |
| M2 | Business Logic, Concurrency & Data Integrity | Concurrency locking (`FOR UPDATE`), Kardex/PMP decimal, state machines, soft delete, DB filter | M1 | DONE (Passed Gate: 2 Reviewers, 2 Challengers, 1 Auditor) |
| M3 | Frontend Modernization & UX/UI Resilience | ESLint 9, mobile nav drawer, toasts, DataTable responsive, lazy routes, Tailwind v4 | M1, M2 | DONE (Passed Gate: 2 Reviewers, 2 Challengers, 1 Auditor) |
| M4 | Final E2E Acceptance, Adversarial Hardening & Audit | 100% E2E test pass, adversarial testing (Tier 5), forensic audit, consolidated report | M1, M2, M3, E2E Track | DONE (Passed Gate: 1 Reviewer, 1 Challenger, 1 Auditor) |

## Interface Contracts
### `UsersModule` ↔ Frontend / Internal Callers
- `GET /api/users`: Returns `UserSummaryDto[]` containing `id`, `email`, `name`, `rut`, `isActive`, `createdAt`, `roles`. NEVER returns `passwordHash` or `superKeyHash`.
- `POST /api/auth/refresh`: Requires `{ refreshToken: string }` validated against `JWT_REFRESH_SECRET` and verifies `user.isActive === true`.

### `MovementsModule` ↔ `PurchasesModule` ↔ Database
- `Stock` row modifications MUST acquire `SELECT ... FOR UPDATE` row locks inside an atomic Prisma `$transaction`.
- `Kardex` queries MUST accept and require `warehouseId` (or filter by warehouse), computing balance per warehouse rather than mixing sites.
- `MovementType` operations must store high-precision `Decimal` unit costs and compute PMP without IEEE-754 precision loss.

### `PurchasesModule` ↔ `UsersModule`
- `PATCH /api/purchases/orders/:id/status`: Transitions order state according to valid state graph:
  - `PENDING` -> `APROBADA` (only if `user.maxApprovalAmount >= order.totalAmount`)
  - `PENDING` -> `APROBADA_EXCEPCION` (requires valid `superKey`)
  - `PENDING` -> `RECHAZADA`
  - `APROBADA` / `APROBADA_EXCEPCION` -> `RECEPCIONADA` (via `receiveOrder`)
  - All other transitions are rejected with HTTP 400 Bad Request.

### Frontend ↔ Backend
- Global HTTP errors (e.g. unique constraint, foreign key violation) return structured `{ statusCode, error, message }` via `PrismaClientExceptionFilter`.
- Dashboard metrics cache key is consistently `['dashboard-metrics']` for both fetching and mutation invalidation.
