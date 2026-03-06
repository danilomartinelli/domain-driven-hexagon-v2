---
globs: "**/commands/**,**/queries/**,**/application/**"
---

# Application Layer Patterns

The application layer orchestrates domain logic. Commands modify state, queries read data.

## Command

Extend `Command` from `@repo/core`. Immutable data carrier.

```typescript
import { Command, CommandProps } from "@repo/core";

export class CreateUserCommand extends Command {
  readonly email: string;
  readonly country: string;
  readonly postalCode: string;
  readonly street: string;

  constructor(props: CommandProps<CreateUserCommand>) {
    super(props);
    this.email = props.email;
    this.country = props.country;
    this.postalCode = props.postalCode;
    this.street = props.street;
  }
}
```

## Command Handler (Service)

Decorated with `@CommandHandler`. Returns `Result<T, E>` from `neverthrow`.

```typescript
import { CommandHandler } from "@nestjs/cqrs";
import { Inject } from "@nestjs/common";
import { err, ok, Result } from "neverthrow";
import { AggregateID, ConflictException } from "@repo/core";

@CommandHandler(CreateUserCommand)
export class CreateUserService {
  constructor(
    @Inject(USER_REPOSITORY)
    protected readonly userRepo: UserRepositoryPort,
  ) {}

  async execute(
    command: CreateUserCommand,
  ): Promise<Result<AggregateID, UserAlreadyExistsError>> {
    const user = UserEntity.create({
      email: command.email,
      address: new Address({
        country: command.country,
        postalCode: command.postalCode,
        street: command.street,
      }),
    });

    try {
      await this.userRepo.transaction(async () => this.userRepo.insert(user));
      return ok(user.id);
    } catch (error: any) {
      if (error instanceof ConflictException) {
        return err(new UserAlreadyExistsError(error));
      }
      throw error; // Unexpected errors rethrown
    }
  }
}
```

Key rules:

- Return `Result<SuccessType, ErrorType>` — never throw for expected failures
- Use `ok()` for success, `err()` for expected failures
- Wrap writes in `this.repo.transaction()`
- Rethrow unexpected errors (let NestJS global exception handler deal with them)
- Inject repository via DI token, type as port interface

## Query

Extend `PaginatedQueryBase` for list queries. Handlers bypass the domain layer for reads.

```typescript
import { PaginatedParams, PaginatedQueryBase, Paginated } from "@repo/core";
import { QueryHandler } from "@nestjs/cqrs";
import { InjectPool } from "@danilomartinelli/nestjs-slonik";
import { DatabasePool, sql } from "slonik";
import { ok, Result } from "neverthrow";

export class FindUsersQuery extends PaginatedQueryBase {
  readonly country?: string;
  readonly postalCode?: string;
  readonly street?: string;

  constructor(props: PaginatedParams<FindUsersQuery>) {
    super(props);
    this.country = props.country;
    this.postalCode = props.postalCode;
    this.street = props.street;
  }
}

@QueryHandler(FindUsersQuery)
export class FindUsersQueryHandler {
  constructor(
    @InjectPool()
    private readonly pool: DatabasePool,
  ) {}

  async execute(
    query: FindUsersQuery,
  ): Promise<Result<Paginated<UserModel>, Error>> {
    const statement = sql.type(userSchema)`
      SELECT * FROM users
      WHERE
        ${query.country ? sql.fragment`country = ${query.country}` : true} AND
        ${query.street ? sql.fragment`street = ${query.street}` : true} AND
        ${query.postalCode ? sql.fragment`"postalCode" = ${query.postalCode}` : true}
      LIMIT ${query.limit}
      OFFSET ${query.offset}`;

    const records = await this.pool.query(statement);
    return ok(
      new Paginated({
        data: records.rows,
        count: records.rowCount,
        limit: query.limit,
        page: query.page,
      }),
    );
  }
}
```

Key rules:

- Query handlers inject `@InjectPool()` for direct SQL — bypass domain/repository
- Use `sql.type(schema)` for Slonik type-safe queries with Zod validation
- Return `Result<Paginated<Model>, Error>`
- `PaginatedQueryBase` provides: `limit`, `offset`, `page`, `orderBy`

## Domain Event Handler

Cross-module communication via `@OnEvent`.

```typescript
import { OnEvent } from "@nestjs/event-emitter";
import { Injectable, Inject } from "@nestjs/common";

@Injectable()
export class CreateWalletWhenUserIsCreatedDomainEventHandler {
  constructor(
    @Inject(WALLET_REPOSITORY)
    private readonly walletRepo: WalletRepositoryPort,
  ) {}

  @OnEvent(UserCreatedDomainEvent.name, { async: true, promisify: true })
  async handle(event: UserCreatedDomainEvent): Promise<any> {
    const wallet = WalletEntity.create({ userId: event.aggregateId });
    return this.walletRepo.insert(wallet);
  }
}
```

- Class naming: `<Action>When<Trigger>DomainEventHandler`
- File naming: `<action-when-trigger>.domain-event-handler.ts`
- Location: `application/event-handlers/`
- Always use `{ async: true, promisify: true }` options

## DO NOT

- Throw exceptions for expected business failures — use `Result` types
- Access repositories from query handlers — inject pool directly
- Import controllers, resolvers, or DTOs from handlers
- Import across module boundaries — use domain events instead
