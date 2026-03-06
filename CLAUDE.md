# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

This is a **pnpm monorepo** with Turbo. Always use `pnpm` (v9.15.4, Node v22.14.0 via Volta).

```bash
pnpm build                # Build all packages (turbo)
pnpm dev                  # Start dev server with watch mode
pnpm lint                 # Lint and autofix (turbo)
pnpm format               # Prettier format
pnpm test                 # Unit tests across all workspaces
pnpm test:e2e             # E2E tests (requires test database)
```

### Running tests from `apps/api`

```bash
cd apps/api
pnpm test                              # All unit tests (*.spec.ts)
npx jest --config .jestrc.json <path>  # Single test file
pnpm test:e2e                          # E2E tests (*.e2e-spec.ts)
```

### Database (Docker required)

```bash
cd apps/api
pnpm docker:test          # Start test PostgreSQL container
pnpm docker:test:down     # Stop test container
pnpm docker:env           # Start dev environment
pnpm seed:up              # Seed development database
```

### Architecture Validation

```bash
cd apps/api
pnpm deps:validate        # Check layer dependency rules via dependency-cruiser
```

## Project Structure

```
apps/api/          # NestJS application (REST + GraphQL + CLI via nest-commander)
packages/core/     # Shared DDD building blocks (@repo/core)
packages/nestjs-slonik/  # NestJS Slonik PostgreSQL module (@danilomartinelli/nestjs-slonik)
```

### Path Aliases (in apps/api)

- `@src/*` → `src/*`
- `@modules/*` → `src/modules/*`
- `@config/*` → `src/configs/*`
- `@tests/*` → `tests/*`
- `@repo/core` → `packages/core`

## Architecture

This project implements **Domain-Driven Design with Hexagonal Architecture** and **CQRS**.

### Module Structure (Vertical Slicing)

Each domain module in `apps/api/src/modules/` follows this layout:

```
modules/<name>/
├── commands/<action>/
│   ├── <action>.command.ts              # Command object
│   ├── <action>.service.ts              # CommandHandler (application logic)
│   ├── <action>.http.controller.ts      # REST endpoint
│   ├── <action>.graphql-resolver.ts     # GraphQL resolver
│   ├── <action>.cli.controller.ts       # CLI command (nest-commander)
│   ├── <action>.message.controller.ts   # Event-driven endpoint
│   └── <action>.request.dto.ts          # Input validation DTO
├── queries/<action>/
│   ├── <action>.query-handler.ts
│   ├── <action>.http.controller.ts
│   └── <action>.request.dto.ts
├── domain/
│   ├── <name>.entity.ts                 # AggregateRoot with factory method
│   ├── <name>.types.ts                  # Props interfaces and enums
│   ├── <name>.errors.ts                 # Domain-specific error classes
│   ├── value-objects/                   # Value Objects
│   └── events/                          # Domain Events (*-domain-event.ts)
├── database/
│   ├── <name>.repository.port.ts        # Repository interface (port)
│   └── <name>.repository.ts             # Slonik implementation (adapter)
├── dtos/                                # Response DTOs
├── <name>.mapper.ts                     # Entity ↔ Persistence model mapping
├── <name>.di-tokens.ts                  # Dependency injection tokens
└── <name>.module.ts                     # NestJS module
```

### Layer Dependency Rules (enforced by dependency-cruiser)

- **Domain** → cannot depend on Application, API, or Infrastructure layers
- **Infrastructure** → cannot depend on API layer
- **Commands/Queries** → cannot depend on API layer
- Domain depends only on `@repo/core` base classes and its own value objects/events

### Key Patterns

- **Entities** extend `AggregateRoot<Props>` from `@repo/core`, use static `create()` factory methods, emit domain events via `addEvent()`
- **Error handling** uses `neverthrow` (`Result<T, E>`, `ok()`, `err()`) — not thrown exceptions — for expected failures in command handlers
- **Repositories** implement port interfaces; injected via DI tokens (`@Inject(USER_REPOSITORY)`)
- **Database** uses Slonik (PostgreSQL) with Zod schemas for runtime validation of persistence models
- **Cross-module communication** via domain events (e.g., Wallet module listens to `UserCreatedDomainEvent`)

### `@repo/core` Package

Provides base classes: `AggregateRoot`, `Entity`, `ValueObject`, `DomainEvent`, `Command`, `Query`, `SqlRepositoryBase`, `Guard`, `ResponseBase`, `PaginatedResponseDto`, `ExceptionInterceptor`, `ContextInterceptor`, `RequestContextService`.

## Code Style

- Prettier: single quotes, trailing commas
- ESLint (flat config): `@typescript-eslint/explicit-module-boundary-types: error`, no property setters, no non-null assertions
- `@typescript-eslint/no-explicit-any` is allowed (off)
- TypeScript strict mode enabled

## Critical Rules (always apply)

- **Never throw exceptions for expected failures** — use `neverthrow` Result types (`ok()`, `err()`)
- **Never import across layer boundaries** — domain cannot import from application/infrastructure/API
- **Always use path aliases** — `@modules/*`, `@src/*`, `@repo/core`, `@tests/*`, `@config/*` (never relative `../../..`)
- **Always create entities via static `create()` factory** — never call constructor directly from outside
- **Always emit domain events** in entity `create()` and state-change methods

## AI Guidance

Detailed architectural patterns and conventions are in `.claude/rules/`:

| Rule File                 | Covers                                                              |
| ------------------------- | ------------------------------------------------------------------- |
| `architecture.md`         | Layer boundaries, hexagonal constraints, cross-module communication |
| `domain-layer.md`         | Entity, ValueObject, DomainEvent, error class patterns              |
| `application-layer.md`    | Command/Query handlers, neverthrow Result types, event handlers     |
| `infrastructure-layer.md` | Repository, Zod schemas, mapper, DI tokens                          |
| `api-layer.md`            | Controllers, DTOs, error mapping, module structure                  |
| `testing.md`              | Factories, BDD with jest-cucumber, integration tests                |
| `imports.md`              | Path aliases and import conventions                                 |

Scaffolding: use the `scaffold-module` skill (`.claude/skills/scaffold-module/`) to generate a full module skeleton.
