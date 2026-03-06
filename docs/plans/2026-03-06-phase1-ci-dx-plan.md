# Phase 1: CI/CD & Developer Experience — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add automated quality guardrails — CI pipeline, pre-commit hooks, Codecov, and a restructured README with badges.

**Architecture:** Single GitHub Actions workflow with 5 parallel jobs (lint, build, test-unit, test-e2e, deps-validate). Self-hosted Turbo remote cache via ducktors/turborepo-remote-cache. Pre-commit hooks with husky v9 + lint-staged v15. README split into concise project landing page + architecture doc.

**Tech Stack:** GitHub Actions, husky, lint-staged, Codecov, shields.io badges

---

### Task 1: Install husky and lint-staged

**Files:**
- Modify: `package.json` (root)

**Step 1: Install dependencies**

Run:
```bash
pnpm add -Dw husky lint-staged
```

**Step 2: Add `prepare` script and `lint-staged` config to root `package.json`**

Add to `"scripts"`:
```json
"prepare": "husky"
```

Add top-level `"lint-staged"` key:
```json
"lint-staged": {
  "*.{ts,tsx,js,mjs}": ["eslint --fix", "prettier --write"],
  "*.{json,md,yml,yaml}": ["prettier --write"]
}
```

**Step 3: Run prepare to initialize husky**

Run:
```bash
pnpm run prepare
```
Expected: `.husky/` directory is created.

**Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml .husky/
git commit -m "chore: install husky and lint-staged"
```

---

### Task 2: Create pre-commit hook

**Files:**
- Create: `.husky/pre-commit`

**Step 1: Create the pre-commit hook file**

Write `.husky/pre-commit`:
```bash
npx lint-staged
pnpm -r exec tsc --noEmit
```

**Step 2: Make it executable**

Run:
```bash
chmod +x .husky/pre-commit
```

**Step 3: Verify the hook works**

Stage a file and test:
```bash
git add .husky/pre-commit
git commit -m "chore: add pre-commit hook with lint-staged and type-check"
```
Expected: The commit runs lint-staged and tsc --noEmit before completing.

---

### Task 3: Create GitHub Actions CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

**Step 1: Create the workflow directory**

Run:
```bash
mkdir -p .github/workflows
```

**Step 2: Write the CI workflow**

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

env:
  TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
  TURBO_TEAM: ${{ secrets.TURBO_TEAM }}
  TURBO_API: ${{ secrets.TURBO_API }}

jobs:
  lint:
    name: Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm format -- --check

  build:
    name: Build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm build

  test-unit:
    name: Unit Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm test -- --coverage
      - uses: codecov/codecov-action@v5
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          directory: apps/api/tests/coverage
          fail_ci_if_error: false

  test-e2e:
    name: E2E Tests
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:17-alpine
        ports:
          - 5433:5432
        env:
          POSTGRES_USER: user
          POSTGRES_PASSWORD: password
          POSTGRES_DB: ddh_tests
        options: >-
          --health-cmd "pg_isready -U user -d ddh_tests"
          --health-interval 5s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - name: Run Flyway migrations
        uses: docker://redgate/flyway
        with:
          args: -url=jdbc:postgresql://postgres:5432/ddh_tests -user=user -password=password migrate
        env:
          FLYWAY_LOCATIONS: filesystem:apps/api/database/migrations
      - name: Run E2E tests
        run: pnpm -F @repo/api test:e2e
        env:
          DB_HOST: localhost
          DB_PORT: 5433
          DB_USERNAME: user
          DB_PASSWORD: password
          DB_NAME: ddh_tests

  deps-validate:
    name: Architecture Validation
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - run: pnpm -F @repo/api deps:validate
```

**Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions CI pipeline with parallel jobs"
```

---

### Task 4: Move architecture content to docs/ARCHITECTURE.md

**Files:**
- Create: `docs/ARCHITECTURE.md`
- Modify: `README.md`

**Step 1: Extract architecture content from README**

Read `README.md` lines 76-1294 (from `# Architecture` to end of file). Write this content to `docs/ARCHITECTURE.md`, prepending a header note:

```markdown
# Architecture Guide

> This guide was originally the main README. It covers DDD, hexagonal architecture, and best practices in detail.
> For project setup and quick start, see the root [README](../README.md).

---
```

Then paste lines 76-1294 from the current README below this header. The `# Architecture` heading from line 76 becomes a `## Architecture` heading since the doc already has an `# Architecture Guide` title.

**Step 2: Commit**

```bash
git add docs/ARCHITECTURE.md
git commit -m "docs: extract architecture guide from README to docs/ARCHITECTURE.md"
```

---

### Task 5: Create new README with badges

**Files:**
- Modify: `README.md` (replace entirely)

**Step 1: Write new README**

Replace `README.md` with:

```markdown
# Domain-Driven Hexagon

[![CI](https://github.com/danilomartinelli/domain-driven-hexagon-v2/actions/workflows/ci.yml/badge.svg)](https://github.com/danilomartinelli/domain-driven-hexagon-v2/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/danilomartinelli/domain-driven-hexagon-v2/graph/badge.svg)](https://codecov.io/gh/danilomartinelli/domain-driven-hexagon-v2)
![Node.js](https://img.shields.io/badge/node-22.x-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)

This project is a fork of [domain-driven-hexagon](https://github.com/Sairyss/domain-driven-hexagon) by [Sairyss](https://github.com/Sairyss). The original repository provides an excellent guide on DDD, hexagonal architecture and best practices. This fork evolves the codebase with updated dependencies, a pnpm/Turborepo monorepo structure, and production-ready tooling.

---

A reference implementation of **Domain-Driven Design with Hexagonal Architecture** and **CQRS** using NestJS, Slonik (PostgreSQL), neverthrow, and Zod.

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 22.x (managed via [Volta](https://volta.sh/))
- [pnpm](https://pnpm.io/) 9.15.4
- [Docker](https://www.docker.com/) (for PostgreSQL)

### Install & Run

```bash
# Install dependencies
pnpm install

# Start dev database
cd apps/api && pnpm docker:env

# Run dev server
pnpm dev
```

### Test

```bash
# Unit tests
pnpm test

# E2E tests (requires test database)
cd apps/api
pnpm docker:test
pnpm test:e2e
```

### Other Commands

```bash
pnpm build            # Build all packages
pnpm lint             # Lint and autofix
pnpm format           # Format with Prettier
```

## Project Structure

```
apps/api/                  # NestJS application (REST + GraphQL + CLI)
packages/core/             # Shared DDD building blocks (@repo/core)
packages/nestjs-slonik/    # NestJS Slonik PostgreSQL module
```

## Documentation

- [Architecture Guide](docs/ARCHITECTURE.md) — DDD, hexagonal architecture, and best practices
- [Developer Playbook](CLAUDE.md) — build commands, module structure, coding conventions
- [Roadmap](NEXT_STEPS.md) — phased plan for evolving this project

## License

MIT
```

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: replace README with concise project landing page and badges"
```

---

### Task 6: Update NEXT_STEPS.md to reflect completed items

**Files:**
- Modify: `NEXT_STEPS.md`

**Step 1: Check off completed Phase 1 items**

In `NEXT_STEPS.md`, update the following checkboxes from `- [ ]` to `- [x]`:

Under **GitHub Actions CI Pipeline:**
- `[x] Workflow on push and pull_request to main`
- `[x] Matrix: Node 22.x, Ubuntu latest`
- `[x] Steps: install → lint → build → test → test:e2e (Postgres service container)`
- `[x] Turbo remote cache for faster CI runs`
- `[x] pnpm deps:validate as a CI step to enforce architectural layer rules`

Under **Pre-commit Hooks:**
- `[x] husky + lint-staged for Prettier and ESLint on staged files`
- `[x] tsc --noEmit for type checking before commit`

Under **README Enhancements:**
- `[x] CI status badge`
- `[x] Coverage badge (Codecov)`
- `[x] Node.js version and license badges`

**Step 2: Commit**

```bash
git add NEXT_STEPS.md
git commit -m "docs: mark Phase 1 items as complete in NEXT_STEPS.md"
```

---

### Task 7: Verify everything works end-to-end

**Step 1: Run lint**

```bash
pnpm lint
```
Expected: Passes with no errors.

**Step 2: Run build**

```bash
pnpm build
```
Expected: All packages build successfully.

**Step 3: Run unit tests**

```bash
pnpm test
```
Expected: All tests pass (currently 0 unit tests, but the command should succeed).

**Step 4: Test the pre-commit hook**

Make a trivial change (e.g., add a blank line to a `.ts` file), stage it, and commit:
```bash
echo "" >> apps/api/src/main.ts
git add apps/api/src/main.ts
git commit -m "test: verify pre-commit hook"
```
Expected: lint-staged and tsc --noEmit run before commit completes. Then revert:
```bash
git reset HEAD~1
git checkout -- apps/api/src/main.ts
```

**Step 5: Verify CI workflow YAML is valid**

Run:
```bash
cat .github/workflows/ci.yml | head -5
```
Expected: Shows `name: CI` and `on:` trigger config. Full validation happens when pushed to GitHub.
