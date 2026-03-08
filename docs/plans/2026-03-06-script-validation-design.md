# Script Validation & Fix Design

**Date:** 2026-03-06
**Goal:** Run all 7 turbo scripts, fix every error, leave repo fully passing.

## Scripts (execution order)

1. `pnpm build` — compile all 3 packages
2. `pnpm typecheck` — `tsc --noEmit` across workspaces
3. `pnpm lint` — ESLint with autofix
4. `pnpm format` — Prettier formatting
5. `pnpm test` — Jest unit tests
6. `pnpm test:e2e` — E2E tests (requires Docker PostgreSQL)
7. `pnpm dev` — dev server boot verification

## Approach

Sequential pipeline: run each script in dependency order, fix errors before moving to the next. This prevents chasing phantom failures caused by upstream issues.

## Fix strategy

- Analyze errors from each script, apply minimal fixes.
- Re-run to verify before proceeding.
- For `test:e2e`: start Docker test DB, run tests, clean up.
- For `dev`: start, verify boot, stop.

## Out of scope

- No new features, refactoring, or improvements beyond making scripts pass.
- No CI/turbo/package manager config changes unless required by a fix.
