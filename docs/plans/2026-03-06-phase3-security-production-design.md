# Phase 3: Security & Production-Readiness — Design

**Date:** 2026-03-06
**Status:** Approved

---

## Summary

Add security hardening, structured logging, and production infrastructure to the DDD reference project. All reusable concerns live in a new `packages/infra` (`@repo/infra`) shared package. Bootstrap-level middleware (Helmet, CORS) stays in `main.ts`.

---

## Decisions

| Decision      | Choice                                | Rationale                                                    |
| ------------- | ------------------------------------- | ------------------------------------------------------------ |
| Structure     | `packages/infra` shared package       | Reusable across future apps in the monorepo                  |
| Logger        | Pino via `nestjs-pino`                | Fastest JSON logger, clean NestJS integration                |
| Health checks | `@nestjs/terminus`                    | Official NestJS module, extensible                           |
| Dockerfile    | Turbo prune, 4-stage multi-stage      | Minimal image size, standard Turborepo approach              |
| Helmet/CORS   | `main.ts` one-liners                  | Pragmatic — these are Express middleware, not NestJS modules |
| Throttling    | `@nestjs/throttler` in SecurityModule | Needs NestJS module + global guard                           |

---

## 1. `packages/infra` Package

New workspace package `@repo/infra` following same conventions as `@repo/core`.

```
packages/infra/
├── package.json              # @repo/infra
├── tsconfig.json
├── src/
│   ├── index.ts              # Barrel exports
│   ├── security/
│   │   ├── security.module.ts          # SecurityModule.forRoot({ ttl, limit })
│   │   ├── security.types.ts           # ThrottleOptions interface
│   │   ├── bootstrap-security.ts       # bootstrapSecurity(app, options) helper
│   │   └── index.ts
│   ├── logging/
│   │   ├── logging.module.ts           # LoggingModule.forRoot({ level, prettyPrint })
│   │   ├── logging.types.ts            # LoggingOptions interface
│   │   └── index.ts
│   └── health/
│       ├── health.module.ts            # HealthModule (static)
│       ├── health.controller.ts        # GET /health
│       ├── slonik-health.indicator.ts  # Custom SlonikHealthIndicator
│       ├── health.types.ts
│       └── index.ts
```

### Dependencies

- `helmet`
- `@nestjs/throttler`
- `nestjs-pino`, `pino-http`, `pino`
- `@nestjs/terminus`
- `pino-pretty` (devDependency)

---

## 2. Security Hardening

### Helmet (main.ts)

```typescript
import helmet from "helmet";
app.use(helmet());
```

Default config provides: CSP, X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, HSTS.

### CORS (main.ts)

```typescript
const corsOrigins = get("CORS_ORIGINS")
  .default("")
  .asString()
  .split(",")
  .filter(Boolean);
app.enableCors({ origin: corsOrigins, credentials: true });
```

New env var: `CORS_ORIGINS` — comma-separated allowlist.

### Rate Limiting (SecurityModule)

```typescript
// packages/infra/src/security/security.module.ts
@Module({})
export class SecurityModule {
  static forRoot(options: ThrottleOptions): DynamicModule {
    return {
      module: SecurityModule,
      imports: [
        ThrottlerModule.forRoot([{ ttl: options.ttl, limit: options.limit }]),
      ],
      providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
    };
  }
}
```

Default: 100 requests per 60 seconds. Configurable via env vars `THROTTLE_TTL`, `THROTTLE_LIMIT`.

### Input Sanitization

Enhance existing `ValidationPipe`:

```typescript
app.useGlobalPipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true, // NEW: reject requests with unknown fields
  }),
);
```

### Bootstrap Helper

```typescript
// packages/infra/src/security/bootstrap-security.ts
export function bootstrapSecurity(
  app: INestApplication,
  options?: BootstrapSecurityOptions,
): void {
  app.use(helmet());
  app.enableCors({
    origin: options?.corsOrigins ?? [],
    credentials: options?.corsCredentials ?? true,
  });
}
```

---

## 3. Structured Logging (Pino)

### LoggingModule

```typescript
// packages/infra/src/logging/logging.module.ts
@Module({})
export class LoggingModule {
  static forRoot(options?: LoggingOptions): DynamicModule {
    return {
      module: LoggingModule,
      imports: [
        NestjsPinoLoggerModule.forRoot({
          pinoHttp: {
            level: options?.level ?? "info",
            genReqId: (req) => req.headers["x-request-id"] ?? randomUUID(),
            transport: options?.prettyPrint
              ? { target: "pino-pretty", options: { colorize: true } }
              : undefined,
          },
        }),
      ],
    };
  }
}
```

### main.ts Integration

```typescript
import { Logger } from "nestjs-pino";
const app = await NestFactory.create(AppModule, { bufferLogs: true });
app.useLogger(app.get(Logger));
```

### Correlation ID Bridge

`genReqId` reads `x-request-id` header or generates a UUID. The existing `ContextInterceptor` sets `RequestContextService.requestId` — we'll update it to read from Pino's request ID so both systems share the same correlation ID.

### What We Get

- Structured JSON logs in production
- Pretty-printed logs in development
- Automatic request/response timing via `pino-http`
- Correlation IDs across all log lines for a request
- Configurable log levels via environment

---

## 4. Production Infrastructure

### Health Check (HealthModule)

Custom `SlonikHealthIndicator` since `@nestjs/terminus` has no built-in Slonik support:

```typescript
@Injectable()
export class SlonikHealthIndicator extends HealthIndicator {
  constructor(@InjectPool() private readonly pool: DatabasePool) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.pool.query(sql.unsafe`SELECT 1`);
      return this.getStatus(key, true);
    } catch (e) {
      return this.getStatus(key, false, { message: e.message });
    }
  }
}
```

**Response shape** (standard `@nestjs/terminus`):

```json
{
  "status": "ok",
  "info": { "database": { "status": "up" } },
  "details": { "database": { "status": "up" } }
}
```

Additional metadata: app version (from `package.json`), uptime (`process.uptime()`).

### Multi-stage Dockerfile

Location: `Dockerfile` at monorepo root.

```dockerfile
# Stage 1: Prune monorepo for api scope
FROM node:22-alpine AS pruner
RUN corepack enable pnpm
WORKDIR /app
COPY . .
RUN npx turbo prune api --docker

# Stage 2: Install dependencies
FROM node:22-alpine AS installer
RUN corepack enable pnpm
WORKDIR /app
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile

# Stage 3: Build
COPY --from=pruner /app/out/full/ .
RUN pnpm turbo build --filter=api

# Stage 4: Production runner
FROM node:22-alpine AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nestjs
COPY --from=installer /app/node_modules ./node_modules
COPY --from=installer /app/apps/api/dist ./apps/api/dist
COPY --from=installer /app/packages/*/dist ./packages/
USER nestjs
EXPOSE 3000
CMD ["node", "apps/api/dist/src/main.js"]
```

### .dockerignore

At monorepo root:

```
node_modules
.git
coverage
*.md
.env*
apps/api/docker/
apps/api/tests/
```

### docker-compose.prod.yml

Location: monorepo root.

```yaml
services:
  api:
    build: .
    ports: ["3000:3000"]
    env_file: .env
    depends_on:
      postgres: { condition: service_healthy }
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:3000/health"]
      interval: 30s
      timeout: 5s
      retries: 3

  postgres:
    image: postgres:17-alpine
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USERNAME}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes: ["pgdata:/var/lib/postgresql/data"]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USERNAME}"]
      interval: 10s
      timeout: 5s
      retries: 5

  flyway:
    image: flyway/flyway
    depends_on:
      postgres: { condition: service_healthy }
    volumes: ["./apps/api/database/migrations:/flyway/sql"]
    command: migrate
    environment:
      FLYWAY_URL: jdbc:postgresql://postgres:5432/${DB_NAME}
      FLYWAY_USER: ${DB_USERNAME}
      FLYWAY_PASSWORD: ${DB_PASSWORD}

volumes:
  pgdata:
```

### Graceful Shutdown

- `app.enableShutdownHooks()` already in `main.ts`
- Add `OnModuleDestroy` lifecycle hook to drain Slonik pool connections on shutdown
- NestJS handles in-flight request completion via Express server close

---

## 5. Environment Variables (New)

| Variable         | Default     | Description                       |
| ---------------- | ----------- | --------------------------------- |
| `CORS_ORIGINS`   | `''` (none) | Comma-separated allowed origins   |
| `THROTTLE_TTL`   | `60000`     | Rate limit window in ms           |
| `THROTTLE_LIMIT` | `100`       | Max requests per window           |
| `LOG_LEVEL`      | `info`      | Pino log level                    |
| `LOG_PRETTY`     | `false`     | Enable pretty printing (dev only) |

---

## 6. Updated main.ts (Final Shape)

```typescript
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { ValidationPipe } from "@nestjs/common";
import { Logger } from "nestjs-pino";
import { get } from "env-var";
import { bootstrapSecurity } from "@repo/infra";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Structured logging
  app.useLogger(app.get(Logger));

  // Security
  bootstrapSecurity(app, {
    corsOrigins: get("CORS_ORIGINS")
      .default("")
      .asString()
      .split(",")
      .filter(Boolean),
  });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger
  const options = new DocumentBuilder().build();
  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup("docs", app, document);

  // Lifecycle
  app.enableShutdownHooks();

  await app.listen(get("PORT").default(3000).asIntPositive());
}
bootstrap();
```

---

## 7. Updated app.module.ts (Final Shape)

```typescript
@Module({
  imports: [
    // Infrastructure
    SecurityModule.forRoot({
      ttl: get("THROTTLE_TTL").default(60000).asIntPositive(),
      limit: get("THROTTLE_LIMIT").default(100).asIntPositive(),
    }),
    LoggingModule.forRoot({
      level: get("LOG_LEVEL").default("info").asString(),
      prettyPrint: get("LOG_PRETTY").default("false").asBool(),
    }),
    HealthModule,

    // Existing
    EventEmitterModule.forRoot(),
    RequestContextModule,
    SlonikModule.forRoot({
      connectionUri: postgresConnectionUri,
      isGlobal: true,
    }),
    CqrsModule,
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
    }),

    // Domain modules
    UserModule,
    WalletModule,
  ],
  controllers: [],
  providers: [...interceptors],
})
export class AppModule {}
```
