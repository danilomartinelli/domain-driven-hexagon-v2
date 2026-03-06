# Next Steps — Domain-Driven Hexagon v2

A phased roadmap for evolving this DDD reference project from a learning resource into a production-grade template.

Each phase builds on the previous one. Start from Phase 1 and work down.

---

## Phase 1: Foundation (CI/CD & Developer Experience)

**Why:** Every contributor should get fast, automated feedback. Without CI, quality depends entirely on manual discipline.

### GitHub Actions CI Pipeline

- [ ] Workflow on `push` and `pull_request` to `main`
- [ ] Matrix: Node 22.x, Ubuntu latest
- [ ] Steps: install (`pnpm install --frozen-lockfile`), lint, build, test, test:e2e (with Postgres service container)
- [ ] Turbo remote cache for faster CI runs
- [ ] `pnpm deps:validate` as a CI step to enforce layer dependency rules

### Pre-commit Hooks

- [ ] Add `husky` + `lint-staged`
- [ ] Run Prettier and ESLint on staged files before each commit
- [ ] Run `tsc --noEmit` for type checking

### README Badges

- [ ] CI status badge
- [ ] Coverage badge (via Codecov or similar)
- [ ] Node.js version badge
- [ ] License badge

---

## Phase 2: Test Coverage

**Why:** The project has only 2 e2e tests. Domain logic — the most valuable layer — has zero unit tests. For a DDD reference project, tests *are* documentation of business rules.

### Domain Layer Unit Tests

- [ ] Entity creation via factory methods (valid and invalid props)
- [ ] Value Object validation (Email, Address, etc.)
- [ ] Domain Event emission on aggregate state changes
- [ ] Guard utility edge cases

### Application Layer Tests

- [ ] Command handler success and failure paths (mock repositories)
- [ ] Query handler tests with mock data
- [ ] Verify domain events are correctly raised after command execution

### Repository Integration Tests

- [ ] Write/read round-trip tests against test database
- [ ] Pagination query tests
- [ ] Mapper tests (entity ↔ persistence model)

### Infrastructure

- [ ] Coverage thresholds in Jest config (e.g., 80% for `domain/`, 70% for `commands/`)
- [ ] Coverage report upload to Codecov in CI
- [ ] Consider a `packages/testing` workspace with shared factories, builders, and test fixtures

---

## Phase 3: Security & Production-Readiness

**Why:** The architecture is solid but missing production essentials. Anyone using this as a template needs these patterns.

### Security Hardening

- [ ] **Helmet** — security headers middleware
- [ ] **CORS** — configurable origin allowlist via env vars
- [ ] **Rate limiting** — `@nestjs/throttler` on public endpoints
- [ ] **Input sanitization** — beyond class-validator whitelist

### Production Infrastructure

- [ ] **Multi-stage Dockerfile** for `apps/api` (build → production slim image)
- [ ] **docker-compose.prod.yml** with API service, Postgres, Flyway
- [ ] **Health check endpoint** (`GET /health`) — DB connectivity, uptime, version
- [ ] **Graceful shutdown** — drain connections, finish in-flight requests

### Structured Logging

- [ ] Replace default NestJS logger with **Pino** (or Winston)
- [ ] Structured JSON output with log levels
- [ ] Request/response logging middleware with timing
- [ ] Correlation ID per request (leverage existing `RequestContextService` + `AsyncLocalStorage`)

---

## Phase 4: Observability & Advanced DDD Patterns

**Why:** Takes the project from "good reference" to "production-grade template" and deepens the DDD patterns.

### Observability

- [ ] **OpenTelemetry** basic setup — traces and metrics
- [ ] Request tracing with correlation IDs propagated across services
- [ ] Database query performance logging
- [ ] GraphQL operation metrics

### GraphQL Hardening

- [ ] Query complexity analysis and depth limiting
- [ ] Authentication/authorization guards on resolvers
- [ ] Proper error formatting (not raw exceptions)
- [ ] Batch query prevention (no nested N+1 patterns)

### Architecture Enforcement

- [ ] Enable circular dependency detection in dependency-cruiser
- [ ] Add cross-module import prevention (modules can only communicate via domain events or public interfaces)
- [ ] Document module boundaries in README

### Advanced DDD Patterns (Examples)

- [ ] **Saga / Process Manager** — example of multi-aggregate workflow (e.g., user registration → wallet creation → welcome email)
- [ ] **Read Model / Projection** — CQRS read-side example with denormalized query table
- [ ] **Domain Service** — example of cross-entity business logic that doesn't belong in a single aggregate

---

## Current Strengths (Preserve These)

These are already well-implemented and should not regress:

- Clean vertical slicing with commands/queries separation
- Hexagonal architecture with enforced layer dependency rules
- `neverthrow` for explicit error handling (no thrown exceptions for business errors)
- Slonik + Zod for type-safe database access
- Domain events for cross-module communication
- Aggregate root pattern with factory methods
- CLAUDE.md for AI-assisted development
