# Design: Improve CLAUDE.md and Create .claude/ Skills & Rules

**Date:** 2026-03-06
**Status:** Approved

## Problem

When Claude Code works on this DDD hexagonal architecture codebase, it frequently:

1. **Uses wrong patterns** — throws exceptions instead of `neverthrow` Results, skips domain events, wrong file structure
2. **Doesn't know scaffolding conventions** — can't reliably create new modules/commands/queries with correct naming and structure
3. **Violates layer boundaries** — imports across hexagonal architecture layers
4. **Misses testing conventions** — doesn't follow factory/builder/BDD patterns
5. **Uses wrong import paths** — relative imports instead of path aliases

## Approach: Rules-Heavy + Scaffolding Skill

- Keep CLAUDE.md lean (quick-reference overview) with a few critical one-liners
- Push detailed patterns into `.claude/rules/` files that auto-load by glob pattern
- One scaffolding skill for full module generation

## Design

### 1. CLAUDE.md Changes

Add two sections to the existing CLAUDE.md:

**"Critical Rules" section** — always-loaded one-liners:

- Never throw exceptions for expected failures — use `neverthrow` Result types (`ok()`, `err()`)
- Never import across layer boundaries — domain cannot import from application/infrastructure/API
- Always use path aliases — `@modules/*`, `@src/*`, `@repo/core`, `@tests/*`, `@config/*`
- Always create entities via static `create()` factory — never call constructor directly

**"AI Guidance" section** — reference list pointing to `.claude/rules/` files and the scaffolding skill.

### 2. Rule Files

Each rule file: when it applies (glob), what to do, what NOT to do, with code examples from the actual codebase.

#### `.claude/rules/architecture.md`

**Glob:** `apps/api/src/**`

- 4-layer model with dependency directions: Domain ← Application ← API; Infrastructure separate
- Domain layer: zero external dependencies (only `@repo/core` base classes)
- Infrastructure (database/): cannot import from API layer
- Commands/Queries: cannot import from API layer
- Cross-module communication: only via domain events, never direct imports
- Validate with `pnpm deps:validate`

#### `.claude/rules/domain-layer.md`

**Glob:** `**/domain/**`

- Entity: extends `AggregateRoot<Props>`, static `create()` factory, `addEvent()` for domain events
- ValueObject: extends `ValueObject<T>`, immutable, validate in constructor, `unpack()` for raw value
- DomainEvent: extends `DomainEvent`, naming `<Entity><Action>DomainEvent`, file naming `<name>-<action>-domain-event.ts`
- Props interfaces in `<name>.types.ts`
- Error classes in `<name>.errors.ts`: extend `ExceptionBase`, code format `DOMAIN.ERROR_NAME`
- Guard class for validation in value objects
- Do NOT: use setters, throw exceptions for business logic, import from other layers

#### `.claude/rules/application-layer.md`

**Glob:** `**/commands/**`, `**/queries/**`

- Commands: extend `Command`, handlers are `@CommandHandler` services
- Return `Result<T, E>` from neverthrow — `ok()` for success, `err()` for expected failures
- Wrap writes in `this.repo.transaction()`
- Queries: extend `PaginatedQueryBase`, handlers bypass domain layer for reads
- Query handlers: inject `@InjectPool()` for direct SQL, use `sql.type(schema)` for type-safe queries
- Event handlers: `@OnEvent(EventClass.name, { async: true, promisify: true })`
- Do NOT: throw exceptions for expected failures, access repositories from query handlers

#### `.claude/rules/infrastructure-layer.md`

**Glob:** `**/database/**`, `**/*.mapper.ts`

- Repository: extend `SqlRepositoryBase<Entity, Model>`, implement port interface
- Zod schema inline: `<name>Schema` constant, `<name>Model` type alias
- Use `sql.type(schema)` for all queries (Slonik + Zod runtime validation)
- `writeQuery()` for mutations (handles validation + event publishing)
- Mapper: three methods — `toPersistence()`, `toDomain()`, `toResponse()`
  - Denormalize value objects in persistence (e.g., Address → country, street, postalCode columns)
  - Reconstruct value objects in `toDomain()`
  - Whitelist response properties in `toResponse()`
- DI tokens: `Symbol('NAME_REPOSITORY')` in `<name>.di-tokens.ts`
- Do NOT: import from API layer, skip Zod validation, use raw SQL without schema types

#### `.claude/rules/api-layer.md`

**Glob:** `**/*.controller.ts`, `**/*.graphql-resolver.ts`, `**/dtos/**`

- Controllers: dispatch commands/queries via CommandBus/QueryBus, map results with `result.match()`
- Map domain errors to HTTP exceptions (e.g., `UserAlreadyExistsError` → `ConflictHttpException`)
- Request DTOs: `class-validator` decorators, `@ApiProperty()`, all `readonly` properties
- Response DTOs: extend `ResponseBase` (includes id, createdAt, updatedAt)
- Paginated responses: extend `PaginatedResponseDto<T>`
- Module file: group providers by category (httpControllers, commandHandlers, queryHandlers, mappers, repositories)

#### `.claude/rules/testing.md`

**Glob:** `**/*.spec.ts`, `**/*.feature`, `**/tests/**`, `**/__tests__/**`

- Unit tests: domain entities, value objects, isolated logic — `<name>.spec.ts`
- BDD tests: jest-cucumber, `loadFeature()`, Given/When/Then — for command handler behavior
- Integration tests: real DB via `createPool()`, truncate tables after each test — `<name>.integration-spec.ts`
- E2E tests: full HTTP lifecycle — `<name>.e2e-spec.ts`
- Factories: `tests/factories/<name>.factory.ts` — `createTest<Entity>(overrides?)` function
- Builders: `tests/builders/<name>.builder.ts` — fluent API with `with<Prop>()` methods and `build()`
- Test helpers: `InMemoryRepository`, `FakeEventBus` from test setup
- Custom Jest matchers available

#### `.claude/rules/imports.md`

**Glob:** `apps/api/src/**`

- Path alias table with examples:
  - `@modules/*` → `src/modules/*`
  - `@src/*` → `src/*`
  - `@config/*` → `src/configs/*`
  - `@tests/*` → `tests/*`
  - `@repo/core` → `packages/core`
- Within `apps/api/src/`: always use aliases, never relative `../../`
- Cross-package: always `@repo/core`, never relative path to `packages/`
- Test files: use `@tests/` for test helpers, factories, builders
- Within the same command/query directory: relative imports are fine (e.g., `./create-user.command`)
- Do NOT: use relative imports that cross module boundaries

### 3. Scaffolding Skill

#### `.claude/skills/scaffold-module/scaffold-module.md`

**Trigger:** User asks to create a new domain module.

**Inputs (gathered via AskUserQuestion):**

1. Module name (e.g., `product`)
2. Entity properties (name, type pairs)
3. Commands to create (e.g., `create-product`, `delete-product`)
4. Queries to create (e.g., `find-products`)
5. Value objects needed (e.g., `Price`, `SKU`)
6. Whether to generate GraphQL resolvers and CLI controllers

**Generated files:**

```
modules/<name>/
├── commands/<action>/
│   ├── __tests__/
│   │   ├── <action>.spec.ts          # BDD test
│   │   └── <action>.feature          # Gherkin feature
│   ├── <action>.command.ts
│   ├── <action>.service.ts
│   ├── <action>.http.controller.ts
│   └── <action>.request.dto.ts
├── queries/<action>/
│   ├── <action>.query-handler.ts
│   ├── <action>.http.controller.ts
│   └── <action>.request.dto.ts
├── domain/
│   ├── __tests__/
│   │   └── <name>.entity.spec.ts     # Entity unit tests
│   ├── <name>.entity.ts
│   ├── <name>.types.ts
│   ├── <name>.errors.ts
│   ├── value-objects/
│   │   └── <vo-name>.value-object.ts
│   └── events/
│       └── <name>-created-domain-event.ts
├── database/
│   ├── <name>.repository.port.ts
│   ├── <name>.repository.ts
│   └── <name>.repository.integration-spec.ts
├── dtos/
│   └── <name>.response.dto.ts
├── <name>.mapper.ts
├── <name>.di-tokens.ts
└── <name>.module.ts

tests/factories/<name>.factory.ts     # Test factory
tests/builders/<name>.builder.ts      # Test builder
migrations/<timestamp>_create_<name>s_table.sql  # DB migration
```

**Additional automation:**

- Registers module in `app.module.ts` imports array
- If GraphQL selected: generates resolvers and GraphQL DTOs
- If CLI selected: generates CLI controllers

**Code patterns:** All generated code follows the exact patterns from existing `user` and `wallet` modules, using the rule files as source of truth.

## File Summary

| File                                                | Type     | Purpose                                   |
| --------------------------------------------------- | -------- | ----------------------------------------- |
| `CLAUDE.md`                                         | Modified | Add Critical Rules + AI Guidance sections |
| `.claude/rules/architecture.md`                     | New      | Layer boundaries, hexagonal constraints   |
| `.claude/rules/domain-layer.md`                     | New      | Entity, ValueObject, DomainEvent patterns |
| `.claude/rules/application-layer.md`                | New      | Command/Query handlers, neverthrow        |
| `.claude/rules/infrastructure-layer.md`             | New      | Repository, Zod, mapper patterns          |
| `.claude/rules/api-layer.md`                        | New      | Controllers, DTOs, error mapping          |
| `.claude/rules/testing.md`                          | New      | Test conventions, factories, BDD          |
| `.claude/rules/imports.md`                          | New      | Path aliases, import rules                |
| `.claude/skills/scaffold-module/scaffold-module.md` | New      | Module scaffolding skill                  |

## Non-Goals

- Not changing existing code or architecture
- Not adding new linting rules or dependency-cruiser config
- Not modifying CI/CD pipeline
