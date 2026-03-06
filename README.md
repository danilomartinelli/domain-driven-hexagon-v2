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
