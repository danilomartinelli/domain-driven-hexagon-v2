---
globs: "**/database/**,**/*.mapper.ts,**/*.di-tokens.ts"
---

# Infrastructure Layer Patterns

Infrastructure implements ports defined by the domain/application layers.

## Repository Port (Interface)

Define in `database/<name>.repository.port.ts`. Extends `RepositoryPort<Entity>`.

```typescript
import { RepositoryPort } from "@repo/core";
import { UserEntity } from "../domain/user.entity";

export interface UserRepositoryPort extends RepositoryPort<UserEntity> {
  findOneByEmail(email: string): Promise<UserEntity | null>;
}
```

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
