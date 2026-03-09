# Codebase Quality Review — Design Document

**Date:** 2026-03-09
**Objective:** Comprehensive code quality review after all implementation phases. Dual purpose: template/reference quality AND production readiness.
**Approach:** Incremental by priority (P0 → P1 → P2), each wave with its own commit.

## Current State

- Build: clean
- Lint: clean
- Tests: 220 passing (31 suites)
- Architecture validation: 0 violations (187 modules, 530 dependencies)

---

## P0 — Structural Violations (Critical)

### 1. Extract DeleteUserCommand to own file + extend Command base class

**Problem:** `DeleteUserCommand` is defined inline in `delete-user.service.ts`, does not extend `Command` from `@repo/core`, and has self-referential constructor (`props: DeleteUserCommand`).

**Fix:** Create `delete-user.command.ts`, move class, extend `Command`, use `CommandProps<DeleteUserCommand>`. Update import in service.

### 2. Fix GET /users using @Body instead of @Query

**Problem:** `FindUsersHttpController` uses `@Body()` for filter params on a GET endpoint — violates HTTP semantics.

**Fix:** Change `@Body() request: FindUsersRequestDto` to `@Query()`. Add `@IsOptional()` decorators to filter DTO fields.

### 3. Remove duplicate wallet.errors.spec.ts

**Problem:** Two test files exist for wallet errors — root `domain/` (3 tests, incomplete) and `domain/__tests__/` (9 tests, complete).

**Fix:** Delete `wallet.errors.spec.ts` from root, keep `__tests__/wallet.errors.spec.ts`.

---

## P1 — Pattern Consistency

### 4. Standardize Domain Error constructors

**Problem:** User errors accept `(cause?, metadata?)` but Wallet errors accept only `(metadata?)`, passing `undefined` for cause.

**Fix:** Standardize all to `(cause?: Error, metadata?: unknown)`. Update `InsufficientBalanceError`, `WalletNotFoundError`, `WalletAlreadyExistsError`.

### 5. Standardize test file colocation in `__tests__/` directories

**Problem:** Some tests are inline in parent directory, others in `__tests__/` subdirectories.

**Fix:** Move all inline tests to `__tests__/` subdirectories (~5 files).

### 6. WalletMapper.toResponse() — implement properly

**Problem:** `toResponse()` throws `'Not implemented'` — inconsistent with UserMapper.

**Fix:** Implement with a `WalletResponseDto` exposing `id`, `userId`, `balance`. Update test.

### 7. Deduplicate user-wallet-summary projection schema

**Problem:** Zod schema `userWalletSummarySchema` is defined in both the projector and the query handler.

**Fix:** Export schema from a single location (e.g., `dtos/user-wallet-summary.read-model.ts`) and import in both places.

### 8. Move GraphQL resolver out of `graphql-example/` subdirectory

**Problem:** The create-user GraphQL resolver sits in a `graphql-example/` subdirectory, suggesting example code rather than production.

**Fix:** Move `create-user.graphql-resolver.ts` to `commands/create-user/` level. Remove `graphql-example/` directory.

---

## P2 — Coverage, Polish & Documentation

### 9. Add unit tests for Query Handlers

**Problem:** `FindUsersQueryHandler` and `FindUserWalletSummaryQueryHandler` lack dedicated unit tests.

**Fix:** Create BDD-style tests with mocked `DatabasePool`.

### 10. Fix MaxListenersExceededWarning in tests

**Problem:** Warning during test run about too many event listeners on Socket.

**Fix:** Increase max listeners in test setup.

### 11. CLI Controller parse methods — add validation or document

**Problem:** Parse methods in CLI controller are no-ops (`return val`).

**Fix:** Add real validation or document that nest-commander requires these methods.

### 12. Document saga event ordering assumptions

**Problem:** Saga assumes `UserCreatedDomainEvent` arrives before `WalletCreatedDomainEvent`. Silent failure if order reverses.

**Fix:** Add documentation/comments explaining the assumption and risk.

### 13. FindUsersRequestDto — ensure @IsOptional() on filter fields

**Problem:** Part of fix #2, filter fields need `@IsOptional()` for query param usage.

**Fix:** Already covered in item #2, listed here for completeness.
