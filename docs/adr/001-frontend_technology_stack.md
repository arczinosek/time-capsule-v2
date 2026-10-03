# ADR 001: Frontend Technology Stack Selection for Family Chronicle

**Status:** Accepted

**Date:** 2026-09-29

**Technical Constraints:** Monorepo architecture, Nest.js backend

## Context and Problem Statement

The "Family Chronicle" (Kronika rodzinna) application is a web platform designed for capturing and organizing family events (births, holidays, trips) along with media attachments (photos, videos, audio recordings) and participant lists. Key domain features include:

- Interactive family tree visualization based on user-defined relationships.
- Multi-user access where individual family members can log in, view events they participated in, and maintain personalized "versions" or perspectives of shared events.

The application uses a monorepo setup with a Nest.js REST API backend. We need to define a modern, maintainable, and scalable frontend architecture using React that seamlessly integrates with the Nest.js backend while providing high developer velocity and optimal client performance.

## Decision Drivers

- **Clear Separation of Concerns:** The backend (Nest.js) owns business logic, authentication, and database access. The frontend should act purely as the user interface layer without duplicating server-side routing or middleware logic.
- **Developer Experience & Velocity:** Fast feedback loops, hot module replacement (HMR), minimal boilerplate, and end-to-end type safety across the monorepo.
- **Complex UI & State Requirements:** Efficient handling of rich media, optimism in UI updates (e.g., custom event versions), and interactive canvas-based tree renders.
- **Maintainability & Bundle Size:** Avoiding monolithic UI framework locks (e.g., MUI) in favor of accessible, composable primitives.

## Considered Options

1. **Option 1:** Next.js (App Router) + Nest.js Backend (Hybrid/BFF Architecture)
2. **Option 2:** Vite + React SPA + TanStack Router (Decoupled SPA Architecture) [SELECTED]

## Decision Outcome

The decision was made to adopt **Option 2: Vite + React SPA + TanStack Router** as the core architecture, backed by a curated set of modern frontend tools.

### Summary of Selected Stack

| Category | Technology | Purpose & Rationale |
|----------|------------|---------------------|
| Monorepo Build System | pnpm workspaces + Turborepo | Fast, deterministic dependency resolution with incremental build caching across backend, frontend, and shared packages. |
| Core Architecture | Vite + React (SPA) | Instant HMR, fast builds, and clean separation of concerns from the Nest.js API. |
| Routing | TanStack Router | Fully type-safe file-based or code-based routing with first-class search parameter management (critical for complex event filtering and family tree navigation). | 
| Server State & Caching | TanStack Query v5 | Industry standard for server state management, automated caching, deduplication, and optimistic updates for event versioning. |
| Client UI State | Zustand | Minimalist state store for client-only state (e.g., audio player state, tree view controls, modal states) without Redux boilerplate. |
| UI Components & Styling | Tailwind CSS v4 + Shadcn UI | Accessible, unstyled primitives (Radix UI) copied directly into the project codebase for total visual control and zero bundle bloat. |
| Forms & Validation | React Hook Form + Zod | High-performance form state management paired with Zod schemas that can be shared between Nest.js DTO validators and frontend forms. |

## Pros and Cons of the Selected Stack

### Positive Consequences

- **Clean Architectural Boundaries:** Nest.js remains the single source of truth for backend logic, authentication, and API endpoints. The frontend remains a static client SPA deployable via CDN or static web server (Nginx/Cloudflare Pages).
- **Maximum Type Safety:** TanStack Router and Zod provide full end-to-end typing from URL query parameters down to form payloads and shared domain models.
- **Enhanced Performance & DX:** Vite delivers near-instant cold starts and sub-millisecond HMR. Turborepo ensures fast CI pipelines by caching unchanged builds.
- **Code Reusability:** Shared Zod validation logic and domain models can live in a `@time-capsule/shared` package inside the monorepo, reused directly by both Nest.js and React Hook Form.

### Negative Consequences & Trade-offs

- **Lack of Default SSR for OpenGraph Preview Cards:** Being a pure SPA, deep-linked event pages will not automatically generate dynamic social media preview cards (e.g., thumbnail previews when sharing a link via WhatsApp).

  - **Mitigation:** If dynamic OpenGraph previews become a critical requirement later, a lightweight serverless edge function or reverse-proxy meta-injector can be introduced for specific sharing endpoints without refactoring the core React SPA.


## Monorepo Layout Preview
```plaintext
time-capsule/
├── apps/
│   ├── api/     # Nest.js Backend Service
│   └── web/     # Vite + React + TanStack Router Client
├── packages/
│   ├── shared/  # Shared Zod schemas, types, and constants
│   └── config/  # Shared ESLint, Prettier, and TypeScript configurations
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```
