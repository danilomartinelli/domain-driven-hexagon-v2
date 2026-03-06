---
name: scaffold-module
description: Scaffold a new DDD domain module with entity, commands, queries, repository, mapper, tests, and migration. Use when creating a new module from scratch.
---

# Scaffold DDD Module

Generate a complete domain module following the project's hexagonal architecture patterns.

## Step 1: Gather Requirements

Use `AskUserQuestion` to collect:

1. **Module name** (singular, lowercase) — e.g., `product`, `order`, `payment`
2. **Entity properties** — list of `name: type` pairs (excluding id, createdAt, updatedAt which are automatic)
3. **Value objects** — any properties that should be grouped into value objects (e.g., `Address`, `Price`)
4. **Commands** — actions that modify state (e.g., `create-product`, `delete-product`, `update-product-price`)
5. **Queries** — read operations (e.g., `find-products`, `get-product-by-id`)
6. **Extra endpoints?** — whether to generate GraphQL resolvers and/or CLI controllers (default: no)

## Step 2: Generate Files

Use the existing `user` module (`apps/api/src/modules/user/`) as the reference template. For each file, follow the exact patterns from the corresponding rule in `.claude/rules/`.

### File Generation Order

Generate files in this order (domain first, then outward):

#### 2.1 Domain Layer

1. `modules/<name>/domain/<name>.types.ts` — Props interfaces, enums
2. `modules/<name>/domain/<name>.errors.ts` — Domain error classes (extend `ExceptionBase`, code format `MODULE.ERROR_NAME`)
3. `modules/<name>/domain/value-objects/<vo>.value-object.ts` — Value objects with validation
4. `modules/<name>/domain/events/<name>-created.domain-event.ts` — Creation domain event (always needed)
5. `modules/<name>/domain/<name>.entity.ts` — Aggregate root with `create()` factory

Follow patterns in `.claude/rules/domain-layer.md`.

#### 2.2 Infrastructure Layer

6. `modules/<name>/database/<name>.repository.port.ts` — Repository interface
7. `modules/<name>/database/<name>.repository.ts` — Slonik implementation with Zod schema
8. `modules/<name>/<name>.mapper.ts` — Entity ↔ Model ↔ Response mapping
9. `modules/<name>/<name>.di-tokens.ts` — DI token symbols

Follow patterns in `.claude/rules/infrastructure-layer.md`.

#### 2.3 Application Layer

For each command: 10. `modules/<name>/commands/<action>/<action>.command.ts` — Command class 11. `modules/<name>/commands/<action>/<action>.service.ts` — Command handler (returns Result) 12. `modules/<name>/commands/<action>/<action>.request.dto.ts` — Request validation DTO

For each query: 13. `modules/<name>/queries/<action>/<action>.query-handler.ts` — Query + handler (bypasses domain) 14. `modules/<name>/queries/<action>/<action>.request.dto.ts` — Query request DTO (if filters needed)

Follow patterns in `.claude/rules/application-layer.md`.

#### 2.4 API Layer

For each command: 15. `modules/<name>/commands/<action>/<action>.http.controller.ts` — REST endpoint

For each query: 16. `modules/<name>/queries/<action>/<action>.http.controller.ts` — REST endpoint

17. `modules/<name>/dtos/<name>.response.dto.ts` — Response DTO
18. `modules/<name>/dtos/<name>.paginated.response.dto.ts` — Paginated response (if list query exists)

Follow patterns in `.claude/rules/api-layer.md`.

#### 2.5 Module Registration

19. `modules/<name>/<name>.module.ts` — NestJS module with grouped providers
20. Register in `apps/api/src/app.module.ts` — Add import

#### 2.6 Route Configuration

21. Add routes to `apps/api/src/configs/app.routes.ts` — Add new route namespace

#### 2.7 Database Migration

22. `apps/api/migrations/<timestamp>_create_<name>s_table.sql` — CREATE TABLE with columns from entity props

#### 2.8 Test Scaffolding

23. `apps/api/tests/factories/<name>.factory.ts` — Factory function with overrides
24. `apps/api/tests/builders/<name>.builder.ts` — Fluent builder class
25. `modules/<name>/domain/__tests__/<name>.entity.spec.ts` — Entity unit tests

For each command: 26. `modules/<name>/commands/<action>/__tests__/<action>.feature` — BDD feature file 27. `modules/<name>/commands/<action>/__tests__/<action>.spec.ts` — BDD spec (jest-cucumber)

28. `modules/<name>/database/<name>.repository.integration-spec.ts` — Repository integration test

Follow patterns in `.claude/rules/testing.md`.

## Step 3: Verify

After generating all files:

1. Run `pnpm build` to check compilation
2. Run `cd apps/api && pnpm deps:validate` to verify architecture rules
3. Run `cd apps/api && pnpm test` to run generated tests
4. Run `pnpm lint` to check code style

## Import Rules

Follow `.claude/rules/imports.md` strictly:

- Use `@modules/*` for cross-module imports
- Use `@repo/core` for base classes
- Use `@config/*` for route configuration
- Relative imports only within the same command/query directory
