# Phase 2: Test Coverage — Design Document

**Date:** 2026-03-06
**Status:** Approved
**Goal:** Documentation-first test coverage — tests serve as teaching tools for DDD patterns, with regression catching as a bonus.

---

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Test style | Plain Jest for domain/unit; jest-cucumber BDD for application layer | Domain tests should be simple and fast; application tests describe use cases naturally in Gherkin |
| `packages/testing` scope | Full toolkit (factories, matchers, in-memory repos, fake event bus, DB helpers) | Reference project should demonstrate testing best practices comprehensively |
| Infrastructure tests | Real Postgres via Docker | Verifies actual SQL, Slonik behavior, and Zod schemas; no false confidence from mocks |
| `@repo/core` tests | Yes, alongside concrete implementations | Documents framework contracts separately from business logic |
| Approach | Bottom-up, layer by layer | Matches DDD dependency direction; `packages/testing` grows incrementally |

---

## 1. `packages/testing` — Shared Test Toolkit

New workspace package `@repo/testing` built incrementally as tests need shared utilities.

### Structure

```
packages/testing/
├── src/
│   ├── factories/          # Entity & VO factories (createTestUser, createTestWallet, createTestAddress)
│   ├── builders/           # Builder pattern (UserBuilder, WalletBuilder)
│   ├── matchers/           # Custom Jest matchers (toBeOkResult, toBeErrResult, toHaveDomainEvent, toHaveDomainEventMatching)
│   ├── fakes/              # InMemoryRepository<T>, FakeEventBus
│   ├── database/           # TestDatabaseHelper (truncate, seed, connection pool)
│   └── index.ts            # Public API
├── package.json
└── tsconfig.json
```

### Factories

- `createTestUser(overrides?)` — sensible defaults, returns `UserEntity`
- `createTestWallet(overrides?)` — sensible defaults, returns `WalletEntity`
- `createTestAddress(overrides?)` — returns `Address` value object
- `UserBuilder().withEmail('x@y.com').withRole(admin).build()` for complex cases

### Custom Jest Matchers

- `toBeOkResult(expected?)` — asserts `Result.isOk()`, optionally checks value
- `toBeErrResult(expected?)` — asserts `Result.isErr()`, optionally checks error type
- `toHaveDomainEvent(EventClass)` — checks aggregate's uncommitted events
- `toHaveDomainEventMatching(EventClass, partialPayload)` — checks event payload

### Fakes

- `InMemoryRepository<T>` implementing `RepositoryPort<T>` — for command handler unit tests without DB
- `FakeEventBus` — captures published events for assertions without EventEmitter2

### DB Helpers

- `TestDatabaseHelper` — truncate tables, seed data, share connection pool per suite
- Extracts patterns from existing `jestGlobalSetup.ts`/`jestSetupAfterEnv.ts`

---

## 2. `@repo/core` Base Class Tests

Location: `packages/core/src/__tests__/` using plain Jest. Uses test-only concrete implementations (`TestEntity extends AggregateRoot`, `TestValueObject extends ValueObject`).

### Entity & AggregateRoot

- Creation assigns UUID, createdAt, updatedAt
- Entity equality based on ID, not props
- `validate()` called on creation
- `AggregateRoot.addEvent()` stores events, `clearEvents()` clears, `domainEvents` returns them
- Domain event metadata (correlationId, causationId, timestamp) correctly set

### ValueObject

- Two VOs with same props: `equals() === true`
- `unpack()` returns props copy
- VOs with different props: not equal

### Guard

- `isEmpty()` for null, undefined, empty string, empty array
- `lengthIsBetween()` boundary cases (exact min, exact max, below min, above max)

### DomainEvent

- Metadata defaults (timestamp, unique ID)
- Custom correlation/causation IDs

### Command & Query

- Props and metadata carried correctly

### Exceptions

- `ExceptionBase` subclasses: correct error code, message, HTTP status
- `ArgumentNotProvidedException`, `ArgumentInvalidException`, `ArgumentOutOfRangeException`, `ConflictException`, `NotFoundException`

---

## 3. Domain Layer Tests (Plain Jest)

Colocated with source: `user.entity.spec.ts` next to `user.entity.ts`.

### UserEntity

- `create()` valid props → entity with correct props, guest role default, emits `UserCreatedDomainEvent`
- `create()` validates props (calls `validate()`)
- `changeRole()` → updates role, emits `UserRoleChangedDomainEvent`
- `makeAdmin()` / `makeModerator()` → shorthand role changes
- `delete()` → emits `UserDeletedDomainEvent`
- `updateAddress()` → updates address, emits `UserAddressUpdatedDomainEvent`
- **Edge cases:** empty email, email format validation (if applicable), role transitions

### WalletEntity

- `create()` valid props → entity with 0 balance, emits `WalletCreatedDomainEvent`
- `deposit(amount)` → increases balance
- `withdraw(amount)` sufficient balance → ok result, decreases balance
- `withdraw(amount)` insufficient balance → err result with `WalletNotEnoughBalanceError`
- **Edge cases:** zero deposit, negative deposit, zero withdraw, withdraw exact balance, large amounts

### Address ValueObject

- Valid props → creates successfully
- Country too short/long → validation error
- Street too short/long → validation error
- PostalCode too short/long → validation error
- Equality: same props → equal, different → not equal
- **Edge cases:** empty strings, boundary lengths (exactly 2, exactly 50), unicode characters

### Domain Events

- Each event carries correct payload fields
- Event `aggregateId` matches emitting entity

### Domain Errors

- `UserAlreadyExistsError` — correct error code, message, HTTP status
- `WalletNotEnoughBalanceError` — correct error code, message, HTTP status

---

## 4. Application Layer Tests (jest-cucumber BDD)

`.feature` files with Gherkin scenarios + step definitions. Colocated in command/query directories. Mocked dependencies via `@repo/testing` fakes.

### CreateUserService

- **Scenario: Successfully creating a new user** — no existing user → ok result with aggregate ID, `UserCreatedDomainEvent` published
- **Scenario: Failing with duplicate email** — existing user → err with `UserAlreadyExistsError`
- **Scenario: Repository throws unexpected error** — repo failure → error propagated correctly

### DeleteUserService

- **Scenario: Successfully deleting existing user** — user exists → ok result, user marked deleted
- **Scenario: Failing to delete non-existent user** — no user → err with `NotFoundException`
- **Scenario: Repository failure during delete** — repo throws → error propagated

### FindUsersQueryHandler

- **Scenario: Finding users with pagination** — 5 users, limit 2 page 1 → 2 users, correct pagination metadata
- **Scenario: No results** — empty repo → empty paginated result
- **Scenario: Repository failure during query** — repo throws → error propagated

### CreateWalletWhenUserIsCreated (Event Handler)

- **Scenario: Wallet created after user registration** — `UserCreatedDomainEvent` → wallet created with userId, 0 balance
- **Scenario: Event handler failure** — repo failure during wallet creation → error handling behavior documented

---

## 5. Infrastructure Layer Tests (Real Postgres)

`*.integration-spec.ts` files in `database/` directories. Run against test Docker container.

### UserRepository

- `insert()` + `findOneById()` round-trip — all fields match
- `findOneByEmail()` — finds existing, returns null for non-existent
- `findAllPaginated()` — correct limit, offset, total count
- `delete()` — marks deleted, no longer findable
- `transaction()` — commit on success, rollback on failure

### WalletRepository

- Same patterns: insert/find round-trip, pagination, delete

### UserMapper

- `toPersistence(UserEntity)` → correct DB model shape (snake_case, serialized address)
- `toDomain(UserModel)` → correct entity reconstruction (props correct, events cleared)
- `toResponse(UserEntity)` → correct DTO shape
- Round-trip: entity → persistence → domain → verify equality

### WalletMapper

- Same patterns as UserMapper

### Zod Persistence Schemas

- Valid data → passes validation
- Missing required fields → rejects
- Wrong types → rejects
- Extra fields → behavior documented (strip vs reject)

---

## 6. Testing Infrastructure & CI

### Coverage Thresholds (`.jestrc.json`)

| Scope | Threshold |
|-------|-----------|
| `packages/core/src/` | 90% (branches, functions, lines, statements) |
| `apps/api/src/modules/**/domain/` | 80% |
| `apps/api/src/modules/**/commands/`, `queries/` | 70% |
| Global | 60% |

### Test File Conventions

| Type | Pattern | DB Required |
|------|---------|-------------|
| Unit | `*.spec.ts` (colocated with source) | No |
| Application BDD | `*.feature` + step defs in command/query dirs | No |
| Integration | `*.integration-spec.ts` in `database/` dirs | Yes (Postgres) |
| E2E | `*.e2e-spec.ts` in `apps/api/tests/` | Yes (Postgres) |

### Jest Configs

- `.jestrc.json` (unit): matches `**/*.spec.ts`, excludes `*.integration-spec.ts` and `*.e2e-spec.ts`
- New integration config: matches `**/*.integration-spec.ts`, requires DB setup
- `jest-e2e.json`: unchanged

### CI Pipeline Updates

- Existing `test` job: unit tests (fast, no DB)
- New `test:integration` job: integration tests (Postgres service container)
- Existing `test:e2e` job: unchanged
- Coverage upload to Codecov after unit + integration tests

### Scripts

- `pnpm test` — unit tests
- `pnpm test:integration` — integration tests (requires Docker)
- `pnpm test:cov` — unit + integration with coverage report
- `pnpm test:e2e` — E2E tests (unchanged)
