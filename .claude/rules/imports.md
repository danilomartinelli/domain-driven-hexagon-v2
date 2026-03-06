---
globs: apps/api/src/**
---

# Import Conventions

## Path Aliases (apps/api)

| Alias        | Maps To         | Use For                                         |
| ------------ | --------------- | ----------------------------------------------- |
| `@modules/*` | `src/modules/*` | Cross-module domain imports (events only)       |
| `@src/*`     | `src/*`         | App-level code (configs, shared)                |
| `@config/*`  | `src/configs/*` | Configuration files                             |
| `@tests/*`   | `tests/*`       | Test helpers, factories, builders               |
| `@repo/core` | `packages/core` | Base classes (AggregateRoot, ValueObject, etc.) |

## Rules

### Always use path aliases for cross-boundary imports

```typescript
// CORRECT
import { UserEntity } from "@modules/user/domain/user.entity";
import { AggregateRoot } from "@repo/core";
import { routesV1 } from "@config/app.routes";
import { createTestUser } from "@tests/factories/user.factory";

// WRONG — never use relative paths that cross boundaries
import { UserEntity } from "../../../modules/user/domain/user.entity";
import { AggregateRoot } from "../../../../packages/core";
```

### Relative imports within the same command/query directory are fine

```typescript
// CORRECT — same directory
import { CreateUserCommand } from "./create-user.command";
import { CreateUserRequestDto } from "./create-user.request.dto";

// CORRECT — parent module files
import { USER_REPOSITORY } from "../../user.di-tokens";
import { UserMapper } from "../user.mapper";
```

### Cross-module imports only for domain events

```typescript
// CORRECT — importing domain event from another module
import { UserCreatedDomainEvent } from "@modules/user/domain/events/user-created.domain-event";

// WRONG — importing entities/services from another module
import { UserEntity } from "@modules/user/domain/user.entity";
import { CreateUserService } from "@modules/user/commands/create-user/create-user.service";
```

### `@danilomartinelli/nestjs-slonik` for database pool

```typescript
// CORRECT
import { InjectPool } from "@danilomartinelli/nestjs-slonik";

// WRONG
import { InjectPool } from "../../../packages/nestjs-slonik";
```

## DO NOT

- Use relative imports (`../../..`) that cross module boundaries
- Use relative paths to reference `packages/` — always use `@repo/core`
- Import entities or services from other modules — only domain events
- Forget to use `@tests/` alias in test files for factories/builders
