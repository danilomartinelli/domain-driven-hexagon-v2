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
- File naming: `<name>-<action>.domain-event.ts` in `events/` directory
- All event properties are `readonly`

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
