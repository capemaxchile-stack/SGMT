# SGMT — Code Review & Agent Architecture Guidelines

## Project Context
SGMT (Sistema de Gestión de Maquinaria y Transporte) is an enterprise equipment and fleet operations management system.

- **Backend**: NestJS 10, Prisma ORM, PostgreSQL 16, JWT Authentication, RBAC Guards.
- **Frontend**: React 19, Vite 5, Tailwind CSS v4, TanStack Query, Lucide Icons.

---

## 1. General Standards & TypeScript
- **Strict Typing**: Never use `any`. Use strongly typed interfaces, DTOs, and utility types.
- **Immutability & Declarative Code**: Prefer `const` over `let`. Never use `var`.
- **Naming Conventions**:
  - Files: kebab-case for backend (`stock-movement.service.ts`), PascalCase for React components and pages (`Sidebar.tsx`, `DocumentacionPage.tsx`).
  - Classes and Interfaces: PascalCase (`StockMovementService`, `UserSummaryDto`, `NavSection`).
  - Variables, functions, and methods: camelCase.
  - Constants: UPPER_SNAKE_CASE.

---

## 2. Backend Guidelines (NestJS & Prisma)
- **Security & Authorization**:
  - Enforce `@UseGuards(JwtAuthGuard, RolesGuard)` on protected endpoints.
  - Never expose sensitive fields (`passwordHash`, `superKeyHash`, credentials) in responses or audit logs.
  - Enforce strict validation pipes (`whitelist: true, forbidNonWhitelisted: true`) on all incoming request DTOs.
- **Data Integrity & Concurrency**:
  - Critical mutations (stock movements, receptions, order status transitions) must execute within Prisma transactions (`$transaction`).
  - Stock updates must apply row-level locking (`FOR UPDATE`) when reading balances to prevent race conditions.
  - Financial and inventory calculations (PMP, unit cost, quantities) must use high-precision decimals (`Prisma.Decimal`), avoiding floating-point IEEE-754 precision loss.
  - Maintain warehouse isolation: Kardex queries and adjustments must always be scoped by warehouse.
- **Error Handling**:
  - Rely on NestJS exceptions (`BadRequestException`, `NotFoundException`, `ForbiddenException`).
  - Translate database exceptions via central filters (`PrismaClientExceptionFilter`).

---

## 3. Frontend Guidelines (React & TanStack Query)
- **Component Architecture**:
  - Use functional components with typed props.
  - Extract reusable UI primitives to `components/ui/` and layouts to `components/layout/`.
  - Avoid unnecessary component re-renders and large monolithic files.
- **State & Data Fetching**:
  - Use TanStack Query hooks for server state.
  - Always synchronize query invalidation keys after mutations (e.g., `['dashboard-metrics']`, `['stock', warehouseId]`).
- **UX & Resilience**:
  - Provide immediate feedback: loading skeletons for tables and interactive toasts for errors and success events.
  - Maintain mobile responsiveness with horizontal scroll minimums on wide tables.

---

## 4. Testing & Git Conventions
- **Tests**: Keep unit and integration tests isolated; never bypass database transaction rollback in test setups.
- **Conventional Commits**: Format commit messages as `type(scope): description` (e.g., `feat(auth): add refresh token validation`). Never include AI attribution or co-authored metadata.
