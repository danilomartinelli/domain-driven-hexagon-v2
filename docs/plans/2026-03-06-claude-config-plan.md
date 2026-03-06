# Claude Config: Rules & Skills Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create `.claude/rules/` and `.claude/skills/` to enforce DDD hexagonal architecture patterns and provide module scaffolding.

**Architecture:** Rule files auto-load by glob pattern when Claude works on matching files. One scaffolding skill generates full module skeletons. CLAUDE.md gets a lean "Critical Rules" section.

**Tech Stack:** Claude Code rules (markdown + globs), Claude Code skills (markdown)

---

### Task 1: Create directory structure

**Files:**

- Create: `.claude/rules/` (directory)

**Step 1: Create the rules directory**

```bash
mkdir -p .claude/rules
```

**Step 2: Verify**

```bash
ls -la .claude/rules/
```

Expected: empty directory exists

---

### Task 2: Write architecture rule

**Files:**

- Create: `.claude/rules/architecture.md`

**Step 1: Write the file**

```markdown
---
globs: apps/api/src/**
---

# Architecture Rules — Hexagonal / DDD / CQRS

This project uses **4 layers** with strict dependency directions. Violations are caught by `dependency-cruiser` (`pnpm deps:validate` from `apps/api/`).

## Layer Model
```

Domain ← Application ← API
↑
Infrastructure

```

- **Domain** (`domain/`): Entities, Value Objects, Domain Events, error classes. ZERO external dependencies except `@repo/core` base classes.
- **Application** (`commands/`, `queries/`, `application/`): Command/query handlers, domain event handlers. Depends on domain. Uses `neverthrow` for results.
- **API** (`*.controller.ts`, `*.graphql-resolver.ts`, `dtos/`): HTTP controllers, GraphQL resolvers, CLI controllers, request/response DTOs.
- **Infrastructure** (`database/`, `*.mapper.ts`): Repository implementations, persistence models, mappers.

## Forbidden Dependencies

| From | Cannot import from |
|------|--------------------|
| Domain | Application, API, Infrastructure |
| Infrastructure | API |
| Commands/Queries (handlers) | API (controllers, DTOs, resolvers) |

## Cross-Module Communication

- Modules communicate ONLY via **domain events** — never import directly from another module's internals.
- Example: Wallet module listens to `UserCreatedDomainEvent` from User module.
- Event handlers live in `application/event-handlers/` and use `@OnEvent(EventClass.name, { async: true, promisify: true })`.

## DO NOT

- Import domain entities, value objects, or events from infrastructure or API layers
- Import controllers or DTOs from command/query handlers
- Import directly between modules (use domain events instead)
- Skip running `pnpm deps:validate` after structural changes
```

**Step 2: Verify file was created**

```bash
cat .claude/rules/architecture.md | head -5
```

Expected: shows the frontmatter with `globs: apps/api/src/**`

---

### Task 3: Write domain layer rule

**Files:**

- Create: `.claude/rules/domain-layer.md`

**Step 1: Write the file**

````markdown
---
globs: "**/domain/**"
---

# Domain Layer Patterns

The domain layer contains business logic. It has ZERO dependencies on other layers — only `@repo/core` base classes.

## Entity (Aggregate Root)

Entities extend `AggregateRoot<Props>` and use a static `create()` factory method.

```typescript
import { AggregateRoot, AggregateID } from "@repo/core";
import { randomUUID } from "crypto";

export class UserEntity extends AggregateRoot<UserProps> {
  protected readonly _id: AggregateID;

  static create(create: CreateUserProps): UserEntity {
    const id = randomUUID();
    const props: UserProps = { ...create, role: UserRoles.guest };
    const user = new UserEntity({ id, props });
    user.addEvent(
      new UserCreatedDomainEvent({
        aggregateId: id,
        email: props.email,
        ...props.address.unpack(),
      }),
    );
    return user;
  }

  // Only expose getters for properties that need external access
  get role(): UserRoles {
    return this.props.role;
  }

  // State changes through behavior methods, not setters
  makeAdmin(): void {
    this.addEvent(
      new UserRoleChangedDomainEvent({
        aggregateId: this.id,
        oldRole: this.props.role,
        newRole: UserRoles.admin,
      }),
    );
    this.props.role = UserRoles.admin;
  }

  // Invariant validation — called by repository before save
  validate(): void {
    // Validate business rules here
  }
}
```
````

Key rules:

- Constructor takes `{ id, props, createdAt?, updatedAt? }` — never call directly from outside
- Always use `static create()` factory which generates UUID and emits creation event
- Access properties via `entity.getProps()` (returns frozen copy with id, createdAt, updatedAt)
- Mutate state through behavior methods (e.g., `makeAdmin()`), never direct prop assignment from outside

## Props Types

Define in `<name>.types.ts`:

```typescript
export interface UserProps {
  role: UserRoles;
  email: string;
  address: Address;
}

export interface CreateUserProps {
  email: string;
  address: Address;
}

export enum UserRoles {
  admin = "admin",
  moderator = "moderator",
  guest = "guest",
}
```

## Value Object

Extend `ValueObject<T>`. Immutable, validated in constructor, structural equality.

```typescript
import { ValueObject, Guard, ArgumentOutOfRangeException } from "@repo/core";

export interface AddressProps {
  country: string;
  postalCode: string;
  street: string;
}

export class Address extends ValueObject<AddressProps> {
  get country(): string {
    return this.props.country;
  }
  get postalCode(): string {
    return this.props.postalCode;
  }
  get street(): string {
    return this.props.street;
  }

  protected validate(props: AddressProps): void {
    if (!Guard.lengthIsBetween(props.country, 2, 50)) {
      throw new ArgumentOutOfRangeException("country is out of range");
    }
    // ... more validation
  }
}
```

- Use `Guard` class for validation checks
- Use `unpack()` to get raw properties
- File naming: `<name>.value-object.ts` in `value-objects/` directory

## Domain Event

Extend `DomainEvent`. Published automatically by repository after persistence.

```typescript
import { DomainEvent, DomainEventProps } from "@repo/core";

export class UserCreatedDomainEvent extends DomainEvent {
  readonly email: string;
  readonly country: string;
  readonly postalCode: string;
  readonly street: string;

  constructor(props: DomainEventProps<UserCreatedDomainEvent>) {
    super(props);
    this.email = props.email;
    this.country = props.country;
    this.postalCode = props.postalCode;
    this.street = props.street;
  }
}
```

- Class naming: `<Entity><Action>DomainEvent` (e.g., `UserCreatedDomainEvent`)
- File naming: `<name>-<action>-domain-event.ts` in `events/` directory (note: actual file uses `user-created.domain-event.ts` pattern — the event file name uses the entity-action prefix without repeating "domain-event" as a directory)

## Domain Errors

Extend `ExceptionBase`. Used for expected business failures.

```typescript
import { ExceptionBase } from "@repo/core";

export class UserAlreadyExistsError extends ExceptionBase {
  static readonly message = "User already exists";
  public readonly code = "USER.ALREADY_EXISTS";

  constructor(cause?: Error, metadata?: unknown) {
    super(UserAlreadyExistsError.message, cause, metadata);
  }
}
```

- Code format: `DOMAIN.ERROR_NAME` (e.g., `USER.ALREADY_EXISTS`, `WALLET.NOT_ENOUGH_BALANCE`)
- File: `<name>.errors.ts` — can contain multiple error classes

## DO NOT

- Use property setters on entities
- Throw exceptions for business logic flow — use `neverthrow` Result in application layer instead
- Import from application, infrastructure, or API layers
- Import from other domain modules — use domain events for cross-module communication
- Call entity constructor directly from outside the entity — use `static create()`

````

---

### Task 4: Write application layer rule

**Files:**
- Create: `.claude/rules/application-layer.md`

**Step 1: Write the file**

```markdown
---
globs: "**/commands/**,**/queries/**,**/application/**"
---

# Application Layer Patterns

The application layer orchestrates domain logic. Commands modify state, queries read data.

## Command

Extend `Command` from `@repo/core`. Immutable data carrier.

```typescript
import { Command, CommandProps } from '@repo/core';

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
````

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

````

---

### Task 5: Write infrastructure layer rule

**Files:**
- Create: `.claude/rules/infrastructure-layer.md`

**Step 1: Write the file**

```markdown
---
globs: "**/database/**,**/*.mapper.ts,**/*.di-tokens.ts"
---

# Infrastructure Layer Patterns

Infrastructure implements ports defined by the domain/application layers.

## Repository Port (Interface)

Define in `database/<name>.repository.port.ts`. Extends `RepositoryPort<Entity>`.

```typescript
import { RepositoryPort } from '@repo/core';
import { UserEntity } from '../domain/user.entity';

export interface UserRepositoryPort extends RepositoryPort<UserEntity> {
  findOneByEmail(email: string): Promise<UserEntity | null>;
}
````

`RepositoryPort<Entity>` provides:

- `insert(entity): Promise<void>`
- `findOneById(id): Promise<Entity | undefined>`
- `findAll(): Promise<Entity[]>`
- `findAllPaginated(params): Promise<Paginated<Entity>>`
- `delete(entity): Promise<boolean>`
- `transaction<T>(handler): Promise<T>`

## Repository Implementation

Extend `SqlRepositoryBase<Entity, Model>`. Define Zod schema inline.

```typescript
import { SqlRepositoryBase } from "@repo/core";
import { InjectPool } from "@danilomartinelli/nestjs-slonik";
import { DatabasePool, sql } from "slonik";
import { z } from "zod";
import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

// 1. Zod schema for runtime validation
export const userSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.preprocess((val: any) => new Date(val), z.date()),
  updatedAt: z.preprocess((val: any) => new Date(val), z.date()),
  email: z.string().email(),
  country: z.string().min(1).max(255),
  postalCode: z.string().min(1).max(20),
  street: z.string().min(1).max(255),
  role: z.nativeEnum(UserRoles),
});

export type UserModel = z.TypeOf<typeof userSchema>;

// 2. Repository class
@Injectable()
export class UserRepository
  extends SqlRepositoryBase<UserEntity, UserModel>
  implements UserRepositoryPort
{
  protected tableName = "users";
  protected schema = userSchema;

  constructor(
    @InjectPool() pool: DatabasePool,
    mapper: UserMapper,
    eventEmitter: EventEmitter2,
  ) {
    super(pool, mapper, eventEmitter, new Logger(UserRepository.name));
  }

  // Domain-specific queries
  async findOneByEmail(email: string): Promise<UserEntity> {
    const user = await this.pool.one(
      sql.type(userSchema)`SELECT * FROM "users" WHERE email = ${email}`,
    );
    return this.mapper.toDomain(user);
  }

  // For mutations, use writeQuery() helper
  async updateAddress(user: UserEntity): Promise<void> {
    const address = user.getProps().address;
    const statement = sql.type(userSchema)`
      UPDATE "users" SET
      street = ${address.street}, country = ${address.country},
      "postalCode" = ${address.postalCode}
      WHERE id = ${user.id}`;
    await this.writeQuery(statement, user);
  }
}
```

Key rules:

- Schema naming: `<name>Schema` constant, `<name>Model` type alias
- Always use `z.preprocess((val: any) => new Date(val), z.date())` for date fields
- Use `sql.type(schema)` for all queries (Slonik + Zod runtime validation)
- Use `writeQuery()` for mutations — it handles validation and event publishing
- Export schema and model type (query handlers import them for read queries)

## Mapper

Implements `Mapper<Entity, Model, ResponseDto>` with three methods.

```typescript
import { Mapper } from "@repo/core";
import { Injectable } from "@nestjs/common";

@Injectable()
export class UserMapper implements Mapper<
  UserEntity,
  UserModel,
  UserResponseDto
> {
  toPersistence(entity: UserEntity): UserModel {
    const copy = entity.getProps();
    const record: UserModel = {
      id: copy.id,
      createdAt: copy.createdAt,
      updatedAt: copy.updatedAt,
      email: copy.email,
      country: copy.address.country, // Denormalize value objects
      postalCode: copy.address.postalCode,
      street: copy.address.street,
      role: copy.role,
    };
    return userSchema.parse(record); // Validate via Zod
  }

  toDomain(record: UserModel): UserEntity {
    return new UserEntity({
      id: record.id,
      createdAt: new Date(record.createdAt),
      updatedAt: new Date(record.updatedAt),
      props: {
        email: record.email,
        role: record.role,
        address: new Address({
          // Reconstruct value objects
          street: record.street,
          postalCode: record.postalCode,
          country: record.country,
        }),
      },
    });
  }

  toResponse(entity: UserEntity): UserResponseDto {
    const props = entity.getProps();
    const response = new UserResponseDto(entity);
    response.email = props.email;
    response.country = props.address.country;
    // Whitelist properties — never use blacklist
    return response;
  }
}
```

Key rules:

- Denormalize value objects in `toPersistence()` (Address → separate columns)
- Reconstruct value objects in `toDomain()`
- Whitelist response properties in `toResponse()` — never expose all props
- Validate persistence model via `schema.parse()` in `toPersistence()`
- `toDomain()` uses `new Entity()` constructor (not `create()`) since events should not re-fire

## DI Tokens

Use `Symbol()` for unique dependency injection tokens.

```typescript
// <name>.di-tokens.ts
export const USER_REPOSITORY = Symbol("USER_REPOSITORY");
```

- Token naming: `UPPERCASE_ENTITY_REPOSITORY` (e.g., `USER_REPOSITORY`, `WALLET_REPOSITORY`)
- Inject in services: `@Inject(USER_REPOSITORY) private readonly userRepo: UserRepositoryPort`
- Register in module: `{ provide: USER_REPOSITORY, useClass: UserRepository }`

## DO NOT

- Import from API layer (controllers, DTOs, resolvers)
- Skip Zod validation in `toPersistence()`
- Use raw SQL without `sql.type(schema)` for type safety
- Use `create()` factory in `toDomain()` — that would re-emit domain events
- Use blacklist approach in `toResponse()` — always whitelist

````

---

### Task 6: Write API layer rule

**Files:**
- Create: `.claude/rules/api-layer.md`

**Step 1: Write the file**

```markdown
---
globs: "**/*.controller.ts,**/*.graphql-resolver.ts,**/dtos/**,**/*.module.ts"
---

# API Layer Patterns

The API layer handles HTTP, GraphQL, CLI, and message endpoints. It dispatches commands/queries and maps results to responses.

## HTTP Controller (Command)

```typescript
import { Body, Controller, HttpStatus, Post,
  ConflictException as ConflictHttpException } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Result } from 'neverthrow';
import { IdResponse, AggregateID, ApiErrorResponse } from '@repo/core';
import { routesV1 } from '@config/app.routes';

@Controller(routesV1.version)
export class CreateUserHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @ApiOperation({ summary: 'Create a user' })
  @ApiResponse({ status: HttpStatus.OK, type: IdResponse })
  @ApiResponse({ status: HttpStatus.CONFLICT,
    description: UserAlreadyExistsError.message, type: ApiErrorResponse })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, type: ApiErrorResponse })
  @Post(routesV1.user.root)
  async create(@Body() body: CreateUserRequestDto): Promise<IdResponse> {
    const command = new CreateUserCommand(body);
    const result: Result<AggregateID, UserAlreadyExistsError> =
      await this.commandBus.execute(command);

    return result.match(
      (id: string) => new IdResponse(id),
      (error: Error) => {
        if (error instanceof UserAlreadyExistsError)
          throw new ConflictHttpException(error.message);
        throw error;
      },
    );
  }
}
````

Key rules:

- Use `result.match()` to handle `ok`/`err` — map domain errors to HTTP exceptions
- Route paths come from `@config/app.routes` (`routesV1`)
- Use `@ApiOperation`, `@ApiResponse` for Swagger docs
- Controller only dispatches commands — no business logic

## HTTP Controller (Query)

```typescript
@Controller(routesV1.version)
export class FindUsersHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get(routesV1.user.root)
  @ApiOperation({ summary: "Find users" })
  @ApiResponse({ status: HttpStatus.OK, type: UserPaginatedResponseDto })
  async findUsers(
    @Body() request: FindUsersRequestDto,
    @Query() queryParams: PaginatedQueryRequestDto,
  ): Promise<UserPaginatedResponseDto> {
    const query = new FindUsersQuery({
      ...request,
      limit: queryParams?.limit,
      page: queryParams?.page,
    });
    const result = await this.queryBus.execute(query);

    const paginated = result.match(
      (data) => data,
      (error) => {
        throw error;
      },
    );

    return new UserPaginatedResponseDto({
      ...paginated,
      data: paginated.data.map((user) => ({
        ...new ResponseBase(user),
        email: user.email,
        country: user.country,
        // Whitelist properties
      })),
    });
  }
}
```

## Request DTO

Use `class-validator` decorators. All properties `readonly`.

```typescript
import { ApiProperty } from "@nestjs/swagger";
import {
  IsEmail,
  IsString,
  MaxLength,
  MinLength,
  Matches,
  IsOptional,
  IsAlphanumeric,
} from "class-validator";

export class CreateUserRequestDto {
  @ApiProperty({ example: "john@gmail.com", description: "User email address" })
  @MaxLength(320)
  @MinLength(5)
  @IsEmail()
  readonly email: string;

  @ApiProperty({ example: "France", description: "Country of residence" })
  @MaxLength(50)
  @MinLength(4)
  @IsString()
  @Matches(/^[a-zA-Z ]*$/)
  readonly country: string;
}
```

## Response DTO

Extend `ResponseBase` (includes id, createdAt, updatedAt).

```typescript
import { ApiProperty } from "@nestjs/swagger";
import { ResponseBase, PaginatedResponseDto } from "@repo/core";

export class UserResponseDto extends ResponseBase {
  @ApiProperty({ example: "john@gmail.com", description: "User's email" })
  email: string;

  @ApiProperty({ example: "France", description: "User's country" })
  country: string;
}

export class UserPaginatedResponseDto extends PaginatedResponseDto<UserResponseDto> {
  @ApiProperty({ type: UserResponseDto, isArray: true })
  readonly data: readonly UserResponseDto[];
}
```

## NestJS Module

Group providers by category for clarity.

```typescript
const httpControllers = [CreateUserHttpController, FindUsersHttpController];
const messageControllers = [CreateUserMessageController];
const cliControllers: Provider[] = [CreateUserCliController];
const graphqlResolvers: Provider[] = [CreateUserGraphqlResolver];
const commandHandlers: Provider[] = [CreateUserService, DeleteUserService];
const queryHandlers: Provider[] = [FindUsersQueryHandler];
const mappers: Provider[] = [UserMapper];
const repositories: Provider[] = [
  { provide: USER_REPOSITORY, useClass: UserRepository },
];

@Module({
  imports: [CqrsModule],
  controllers: [...httpControllers, ...messageControllers],
  providers: [
    Logger,
    ...cliControllers,
    ...repositories,
    ...graphqlResolvers,
    ...commandHandlers,
    ...queryHandlers,
    ...mappers,
  ],
})
export class UserModule {}
```

## DO NOT

- Put business logic in controllers — dispatch commands/queries instead
- Return raw domain entities from controllers — use response DTOs
- Use blacklist approach for response properties — always whitelist
- Skip Swagger decorators (`@ApiProperty`, `@ApiOperation`, `@ApiResponse`)

````

---

### Task 7: Write testing rule

**Files:**
- Create: `.claude/rules/testing.md`

**Step 1: Write the file**

```markdown
---
globs: "**/*.spec.ts,**/*.feature,**/tests/**,**/__tests__/**"
---

# Testing Patterns

## Test Types & File Naming

| Type | File Pattern | Location | Runs With |
|------|-------------|----------|-----------|
| Unit | `<name>.spec.ts` | `domain/__tests__/` or inline | `pnpm test` |
| BDD (command) | `<action>.spec.ts` + `<action>.feature` | `commands/<action>/__tests__/` | `pnpm test` |
| Integration | `<name>.repository.integration-spec.ts` | `database/` | `pnpm test:integration` |
| E2E | `<name>.e2e-spec.ts` | `tests/` (root) | `pnpm test:e2e` |

## Factory Pattern

Location: `apps/api/tests/factories/<name>.factory.ts`

```typescript
import { UserEntity } from '@modules/user/domain/user.entity';
import { Address } from '@modules/user/domain/value-objects/address.value-object';

export interface CreateTestUserOverrides {
  email?: string;
  country?: string;
  postalCode?: string;
  street?: string;
}

export function createTestAddress(
  overrides?: Partial<{ country: string; postalCode: string; street: string }>,
): Address {
  return new Address({
    country: overrides?.country ?? 'England',
    postalCode: overrides?.postalCode ?? '28566',
    street: overrides?.street ?? 'Grand Avenue',
  });
}

export function createTestUser(overrides?: CreateTestUserOverrides): UserEntity {
  return UserEntity.create({
    email: overrides?.email ?? 'test@example.com',
    address: createTestAddress(overrides),
  });
}
````

- Function naming: `createTest<Entity>(overrides?)` or `createTest<ValueObject>(overrides?)`
- Provide sensible defaults for all properties
- Accept optional overrides object

## Builder Pattern

Location: `apps/api/tests/builders/<name>.builder.ts`

```typescript
import { UserEntity } from "@modules/user/domain/user.entity";
import { Address } from "@modules/user/domain/value-objects/address.value-object";

export class UserBuilder {
  private email = "test@example.com";
  private country = "England";
  private postalCode = "28566";
  private street = "Grand Avenue";

  withEmail(email: string): this {
    this.email = email;
    return this;
  }

  withCountry(country: string): this {
    this.country = country;
    return this;
  }

  build(): UserEntity {
    return UserEntity.create({
      email: this.email,
      address: new Address({
        country: this.country,
        postalCode: this.postalCode,
        street: this.street,
      }),
    });
  }
}
```

- Fluent API with `with<Prop>()` methods returning `this`
- `build()` method creates the entity
- Use builders when tests need many variations of the same entity

## BDD Tests (jest-cucumber)

Feature file (Gherkin): `commands/<action>/__tests__/<action>.feature`

```gherkin
Feature: Create a user (command handler)

  Scenario: Successfully creating a new user
    Given no user with email "john@test.com" exists
    When I execute the create user command with email "john@test.com"
    Then the result is ok with an aggregate ID
    And a UserCreatedDomainEvent was published via the repository

  Scenario: Failing to create a user with a duplicate email
    Given a user with email "john@test.com" already exists
    When I execute the create user command with email "john@test.com"
    Then the result is an error of type UserAlreadyExistsError
```

Spec file: `commands/<action>/__tests__/<action>.spec.ts`

```typescript
import { defineFeature, loadFeature } from "jest-cucumber";
import { Result } from "neverthrow";

const feature = loadFeature(
  "src/modules/user/commands/create-user/__tests__/create-user.feature",
);

defineFeature(feature, (test) => {
  let service: CreateUserService;
  let mockRepo: { insert: jest.Mock; transaction: jest.Mock /* ... */ };
  let result: Result<string, UserAlreadyExistsError>;

  beforeEach(() => {
    mockRepo = {
      insert: jest.fn().mockResolvedValue(undefined),
      transaction: jest.fn((handler: () => Promise<any>) => handler()),
      // ... other methods
    };
    service = new CreateUserService(mockRepo as any);
  });

  test("Successfully creating a new user", ({ given, when, then, and }) => {
    given(/^no user with email "(.*)" exists$/, () => {
      // Default mock: insert succeeds
    });

    when(
      /^I execute the create user command with email "(.*)"$/,
      async (email: string) => {
        const command = new CreateUserCommand({
          email,
          country: "England",
          postalCode: "28566",
          street: "Grand Avenue",
        });
        result = await service.execute(command);
      },
    );

    then("the result is ok with an aggregate ID", () => {
      expect(result.isOk()).toBe(true);
    });
  });
});
```

## Domain Unit Tests

```typescript
describe("UserEntity", () => {
  const validAddress = new Address({
    country: "England",
    postalCode: "28566",
    street: "Grand Avenue",
  });

  describe("create", () => {
    it("creates a user with default guest role", () => {
      const user = UserEntity.create({
        email: "test@example.com",
        address: validAddress,
      });
      expect(user.role).toBe(UserRoles.guest);
    });

    it("emits UserCreatedDomainEvent", () => {
      const user = UserEntity.create({
        email: "test@example.com",
        address: validAddress,
      });
      expect(user.domainEvents).toHaveLength(1);
      expect(user.domainEvents[0]).toBeInstanceOf(UserCreatedDomainEvent);
    });
  });
});
```

## Integration Tests (Repository)

```typescript
describe("UserRepository (integration)", () => {
  let pool: DatabasePool;
  let repository: UserRepository;

  beforeAll(async () => {
    pool = await createPool(postgresConnectionUri);
    repository = new (UserRepository as any)(pool, mapper, eventEmitter);
  });

  afterAll(async () => {
    await pool.end();
  });
  afterEach(async () => {
    await pool.query(sql.unsafe`TRUNCATE "users" CASCADE`);
  });

  it("round-trips a user entity", async () => {
    const user = createUser();
    await repository.insert(user);
    const found = await repository.findOneById(user.id);
    expect(found?.id).toBe(user.id);
  });
});
```

Key rules:

- Always truncate tables in `afterEach` (not `afterAll`) for test isolation
- Use `CASCADE` in truncate to handle foreign keys
- Mock `nestjs-request-context` in setup files (already done in `tests/setup/`)

## Test Setup

- Unit tests: `tests/setup/jest-unit-setup.ts` — mocks `nestjs-request-context`
- Integration tests: `tests/setup/jest-integration-setup.ts` — mocks request context, connects to test DB
- E2E tests: `tests/setup/jestSetupAfterEnv.ts` — bootstraps full NestJS app

## DO NOT

- Skip testing domain events in entity creation tests
- Use real database connections in unit tests
- Forget to truncate tables between integration tests
- Test implementation details — test behavior through public API

````

---

### Task 8: Write imports rule

**Files:**
- Create: `.claude/rules/imports.md`

**Step 1: Write the file**

```markdown
---
globs: apps/api/src/**
---

# Import Conventions

## Path Aliases (apps/api)

| Alias | Maps To | Use For |
|-------|---------|---------|
| `@modules/*` | `src/modules/*` | Cross-module domain imports (events only) |
| `@src/*` | `src/*` | App-level code (configs, shared) |
| `@config/*` | `src/configs/*` | Configuration files |
| `@tests/*` | `tests/*` | Test helpers, factories, builders |
| `@repo/core` | `packages/core` | Base classes (AggregateRoot, ValueObject, etc.) |

## Rules

### Always use path aliases for cross-boundary imports

```typescript
// CORRECT
import { UserEntity } from '@modules/user/domain/user.entity';
import { AggregateRoot } from '@repo/core';
import { routesV1 } from '@config/app.routes';
import { createTestUser } from '@tests/factories/user.factory';

// WRONG — never use relative paths that cross boundaries
import { UserEntity } from '../../../modules/user/domain/user.entity';
import { AggregateRoot } from '../../../../packages/core';
````

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

````

---

### Task 9: Write scaffold-module skill

**Files:**
- Create: `.claude/skills/scaffold-module/scaffold-module.md`

**Step 1: Create directory**

```bash
mkdir -p .claude/skills/scaffold-module
````

**Step 2: Write the skill file**

The skill file should contain the complete scaffolding instructions. It will reference the rule files for pattern details and use the existing `user` and `wallet` modules as templates.

```markdown
---
name: scaffold-module
description: Scaffold a new DDD domain module with entity, commands, queries, repository, mapper, tests, and migration. Use when creating a new module from scratch.
---

# Scaffold DDD Module

Generate a complete domain module following the project's hexagonal architecture patterns.

## Step 1: Gather Requirements

Use `AskUserQuestion` to collect:

1. **Module name** (singular, lowercase) — e.g., `product`, `order`, `payment`
2. **Entity properties** — list of `name: type` pairs (excluding id, createdAt, updatedAt which are automatic)
3. **Value objects** — any properties that should be grouped into value objects (e.g., `Address`, `Price`)
4. **Commands** — actions that modify state (e.g., `create-product`, `delete-product`, `update-product-price`)
5. **Queries** — read operations (e.g., `find-products`, `get-product-by-id`)
6. **Extra endpoints?** — whether to generate GraphQL resolvers and/or CLI controllers (default: no)

## Step 2: Generate Files

Use the existing `user` module (`apps/api/src/modules/user/`) as the reference template. For each file, follow the exact patterns from the corresponding rule in `.claude/rules/`.

### File Generation Order

Generate files in this order (domain first, then outward):

#### 2.1 Domain Layer

1. `modules/<name>/domain/<name>.types.ts` — Props interfaces, enums
2. `modules/<name>/domain/<name>.errors.ts` — Domain error classes (extend `ExceptionBase`, code format `MODULE.ERROR_NAME`)
3. `modules/<name>/domain/value-objects/<vo>.value-object.ts` — Value objects with validation
4. `modules/<name>/domain/events/<name>-created.domain-event.ts` — Creation domain event (always needed)
5. `modules/<name>/domain/<name>.entity.ts` — Aggregate root with `create()` factory

Follow patterns in `.claude/rules/domain-layer.md`.

#### 2.2 Infrastructure Layer

6. `modules/<name>/database/<name>.repository.port.ts` — Repository interface
7. `modules/<name>/database/<name>.repository.ts` — Slonik implementation with Zod schema
8. `modules/<name>/<name>.mapper.ts` — Entity ↔ Model ↔ Response mapping
9. `modules/<name>/<name>.di-tokens.ts` — DI token symbols

Follow patterns in `.claude/rules/infrastructure-layer.md`.

#### 2.3 Application Layer

For each command: 10. `modules/<name>/commands/<action>/<action>.command.ts` — Command class 11. `modules/<name>/commands/<action>/<action>.service.ts` — Command handler (returns Result) 12. `modules/<name>/commands/<action>/<action>.request.dto.ts` — Request validation DTO

For each query: 13. `modules/<name>/queries/<action>/<action>.query-handler.ts` — Query + handler (bypasses domain) 14. `modules/<name>/queries/<action>/<action>.request.dto.ts` — Query request DTO (if filters needed)

Follow patterns in `.claude/rules/application-layer.md`.

#### 2.4 API Layer

For each command: 15. `modules/<name>/commands/<action>/<action>.http.controller.ts` — REST endpoint

For each query: 16. `modules/<name>/queries/<action>/<action>.http.controller.ts` — REST endpoint

17. `modules/<name>/dtos/<name>.response.dto.ts` — Response DTO
18. `modules/<name>/dtos/<name>.paginated.response.dto.ts` — Paginated response (if list query exists)

Follow patterns in `.claude/rules/api-layer.md`.

#### 2.5 Module Registration

19. `modules/<name>/<name>.module.ts` — NestJS module with grouped providers
20. Register in `apps/api/src/app.module.ts` — Add import

#### 2.6 Route Configuration

21. Add routes to `apps/api/src/configs/app.routes.ts` — Add new route namespace

#### 2.7 Database Migration

22. `apps/api/migrations/<timestamp>_create_<name>s_table.sql` — CREATE TABLE with columns from entity props

#### 2.8 Test Scaffolding

23. `apps/api/tests/factories/<name>.factory.ts` — Factory function with overrides
24. `apps/api/tests/builders/<name>.builder.ts` — Fluent builder class
25. `modules/<name>/domain/__tests__/<name>.entity.spec.ts` — Entity unit tests

For each command: 26. `modules/<name>/commands/<action>/__tests__/<action>.feature` — BDD feature file 27. `modules/<name>/commands/<action>/__tests__/<action>.spec.ts` — BDD spec (jest-cucumber)

28. `modules/<name>/database/<name>.repository.integration-spec.ts` — Repository integration test

Follow patterns in `.claude/rules/testing.md`.

## Step 3: Verify

After generating all files:

1. Run `pnpm build` to check compilation
2. Run `cd apps/api && pnpm deps:validate` to verify architecture rules
3. Run `cd apps/api && pnpm test` to run generated tests
4. Run `pnpm lint` to check code style

## Import Rules

Follow `.claude/rules/imports.md` strictly:

- Use `@modules/*` for cross-module imports
- Use `@repo/core` for base classes
- Use `@config/*` for route configuration
- Relative imports only within the same command/query directory
```

---

### Task 10: Update CLAUDE.md

**Files:**

- Modify: `CLAUDE.md` (append after the Code Style section at the end)

**Step 1: Add Critical Rules and AI Guidance sections**

Append the following to the end of `CLAUDE.md`:

```markdown
## Critical Rules (always apply)

- **Never throw exceptions for expected failures** — use `neverthrow` Result types (`ok()`, `err()`)
- **Never import across layer boundaries** — domain cannot import from application/infrastructure/API
- **Always use path aliases** — `@modules/*`, `@src/*`, `@repo/core`, `@tests/*`, `@config/*` (never relative `../../..`)
- **Always create entities via static `create()` factory** — never call constructor directly from outside
- **Always emit domain events** in entity `create()` and state-change methods

## AI Guidance

Detailed architectural patterns and conventions are in `.claude/rules/`:

| Rule File                 | Covers                                                              |
| ------------------------- | ------------------------------------------------------------------- |
| `architecture.md`         | Layer boundaries, hexagonal constraints, cross-module communication |
| `domain-layer.md`         | Entity, ValueObject, DomainEvent, error class patterns              |
| `application-layer.md`    | Command/Query handlers, neverthrow Result types, event handlers     |
| `infrastructure-layer.md` | Repository, Zod schemas, mapper, DI tokens                          |
| `api-layer.md`            | Controllers, DTOs, error mapping, module structure                  |
| `testing.md`              | Factories, BDD with jest-cucumber, integration tests                |
| `imports.md`              | Path aliases and import conventions                                 |

Scaffolding: use the `scaffold-module` skill (`.claude/skills/scaffold-module/`) to generate a full module skeleton.
```

**Step 2: Verify CLAUDE.md**

```bash
tail -25 CLAUDE.md
```

Expected: shows the new Critical Rules and AI Guidance sections

---

### Task 11: Commit all changes

**Step 1: Stage files**

```bash
git add .claude/rules/architecture.md \
       .claude/rules/domain-layer.md \
       .claude/rules/application-layer.md \
       .claude/rules/infrastructure-layer.md \
       .claude/rules/api-layer.md \
       .claude/rules/testing.md \
       .claude/rules/imports.md \
       .claude/skills/scaffold-module/scaffold-module.md \
       CLAUDE.md \
       docs/plans/2026-03-06-claude-config-design.md \
       docs/plans/2026-03-06-claude-config-plan.md
```

**Step 2: Commit**

```bash
git commit -m "feat: add .claude rules and scaffold-module skill for DDD architecture enforcement

Add 7 rule files (.claude/rules/) covering architecture boundaries, domain/application/
infrastructure/API layer patterns, testing conventions, and import aliases. Add scaffold-module
skill for generating complete DDD modules. Update CLAUDE.md with critical rules section.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

**Step 3: Verify**

```bash
git log --oneline -1
git status
```

Expected: clean working tree, commit shows in log
