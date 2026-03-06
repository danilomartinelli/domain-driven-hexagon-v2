---
globs: apps/api/src/**
---

# Architecture Rules — Hexagonal / DDD / CQRS

This project uses **4 layers** with strict dependency directions. Violations are caught by `dependency-cruiser` (`pnpm deps:validate` from `apps/api/`).

## Layer Model

```
Domain  ←  Application  ←  API
                ↑
          Infrastructure
```

- **Domain** (`domain/`): Entities, Value Objects, Domain Events, error classes. ZERO external dependencies except `@repo/core` base classes.
- **Application** (`commands/`, `queries/`, `application/`): Command/query handlers, domain event handlers. Depends on domain. Uses `neverthrow` for results.
- **API** (`*.controller.ts`, `*.graphql-resolver.ts`, `dtos/`): HTTP controllers, GraphQL resolvers, CLI controllers, request/response DTOs.
- **Infrastructure** (`database/`, `*.mapper.ts`): Repository implementations, persistence models, mappers.

## Forbidden Dependencies

| From                        | Cannot import from                 |
| --------------------------- | ---------------------------------- |
| Domain                      | Application, API, Infrastructure   |
| Infrastructure              | API                                |
| Commands/Queries (handlers) | API (controllers, DTOs, resolvers) |

## Cross-Module Communication

- Modules communicate ONLY via **domain events** — never import directly from another module's internals.
- Example: Wallet module listens to `UserCreatedDomainEvent` from User module.
- Event handlers live in `application/event-handlers/` and use `@OnEvent(EventClass.name, { async: true, promisify: true })`.

## DO NOT

- Import domain entities, value objects, or events from infrastructure or API layers
- Import controllers or DTOs from command/query handlers
- Import directly between modules (use domain events instead)
- Skip running `pnpm deps:validate` after structural changes
