---
globs: "**/*.spec.ts,**/*.feature,**/tests/**,**/__tests__/**"
---

# Testing Patterns

## Test Types & File Naming

| Type          | File Pattern                            | Location                       | Runs With               |
| ------------- | --------------------------------------- | ------------------------------ | ----------------------- |
| Unit          | `<name>.spec.ts`                        | `domain/__tests__/` or inline  | `pnpm test`             |
| BDD (command) | `<action>.spec.ts` + `<action>.feature` | `commands/<action>/__tests__/` | `pnpm test`             |
| Integration   | `<name>.repository.integration-spec.ts` | `database/`                    | `pnpm test:integration` |
| E2E           | `<name>.e2e-spec.ts`                    | `tests/` (root)                | `pnpm test:e2e`         |

## Factory Pattern

Location: `apps/api/tests/factories/<name>.factory.ts`

```typescript
import { UserEntity } from "@modules/user/domain/user.entity";
import { Address } from "@modules/user/domain/value-objects/address.value-object";

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
    country: overrides?.country ?? "England",
    postalCode: overrides?.postalCode ?? "28566",
    street: overrides?.street ?? "Grand Avenue",
  });
}

export function createTestUser(
  overrides?: CreateTestUserOverrides,
): UserEntity {
  return UserEntity.create({
    email: overrides?.email ?? "test@example.com",
    address: createTestAddress(overrides),
  });
}
```

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
