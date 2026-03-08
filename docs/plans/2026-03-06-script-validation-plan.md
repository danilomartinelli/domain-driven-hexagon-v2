# Script Validation & Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the only failing script (`pnpm dev`) by making the app port configurable via `PORT` env var and clearing the conflicting process.

**Architecture:** Read `PORT` from environment using the existing `env-var` package (already used in `database.config.ts`), defaulting to 3000. Add `PORT` to `.env`, `.env.example`, and `.env.test`.

**Tech Stack:** NestJS, env-var, TypeScript

---

## Pre-flight: Current State

All scripts pass except `pnpm dev`:

- `pnpm build` — PASS
- `pnpm typecheck` — PASS
- `pnpm lint` — PASS
- `pnpm format` — PASS
- `pnpm test` — PASS (2 suites, 7 tests)
- `pnpm test:e2e` — PASS (2 suites, 7 tests)
- `pnpm dev` — FAIL (`EADDRINUSE: address already in use :::3000`)

Root cause: `apps/api/src/main.ts:18` hardcodes `app.listen(3000)` and port 3000 is occupied by an existing process.

---

### Task 1: Kill the conflicting process on port 3000

**Step 1: Kill the process**

```bash
kill $(lsof -ti :3000)
```

**Step 2: Verify port is free**

```bash
lsof -i :3000
```

Expected: No output (port is free)

---

### Task 2: Make app port configurable via PORT env var

**Files:**

- Modify: `apps/api/src/main.ts:18`
- Modify: `apps/api/.env` (add PORT)
- Modify: `apps/api/.env.example` (add PORT)
- Modify: `apps/api/.env.test` (add PORT)

**Step 1: Add PORT to env files**

In `apps/api/.env`, add at the end:

```
PORT=3000
```

In `apps/api/.env.example`, add at the end:

```
PORT=3000
```

In `apps/api/.env.test`, keep as-is (tests don't use the dev server port).

**Step 2: Update main.ts to read PORT from env**

Replace line 18 in `apps/api/src/main.ts`:

```typescript
// Before:
await app.listen(3000);

// After:
import { get } from "env-var";
// ... (import goes at top of file with other imports)
await app.listen(get("PORT").default(3000).asIntPositive());
```

Full updated `apps/api/src/main.ts`:

```typescript
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { ValidationPipe } from "@nestjs/common";
import { get } from "env-var";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const options = new DocumentBuilder().build();

  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup("docs", app, document);

  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  app.enableShutdownHooks();

  await app.listen(get("PORT").default(3000).asIntPositive());
}
bootstrap();
```

**Step 3: Run typecheck**

```bash
pnpm typecheck
```

Expected: PASS

**Step 4: Run lint**

```bash
pnpm lint
```

Expected: PASS

**Step 5: Run format**

```bash
pnpm format
```

Expected: PASS (or auto-fixes formatting)

**Step 6: Run tests**

```bash
pnpm test
```

Expected: PASS (tests don't import main.ts)

**Step 7: Run e2e tests**

```bash
pnpm test:e2e
```

Expected: PASS

**Step 8: Run dev server**

```bash
# Boot dev server, verify it starts, then kill
pnpm dev &
DEV_PID=$!
sleep 15
kill $DEV_PID
```

Expected: "Nest application successfully started" in output, no EADDRINUSE error.

**Step 9: Commit**

```bash
git add apps/api/src/main.ts apps/api/.env apps/api/.env.example
git commit -m "fix: make app port configurable via PORT env var

Replaces hardcoded port 3000 with env-var lookup, defaulting to 3000.
Prevents EADDRINUSE crashes when port is occupied."
```
