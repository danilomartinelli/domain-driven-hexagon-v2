---
globs: "**/*.controller.ts,**/*.graphql-resolver.ts,**/dtos/**,**/*.module.ts"
---

# API Layer Patterns

The API layer handles HTTP, GraphQL, CLI, and message endpoints. It dispatches commands/queries and maps results to responses.

## HTTP Controller (Command)

```typescript
import {
  Body,
  Controller,
  HttpStatus,
  Post,
  ConflictException as ConflictHttpException,
} from "@nestjs/common";
import { CommandBus } from "@nestjs/cqrs";
import { ApiOperation, ApiResponse } from "@nestjs/swagger";
import { Result } from "neverthrow";
import { IdResponse, AggregateID, ApiErrorResponse } from "@repo/core";
import { routesV1 } from "@config/app.routes";

@Controller(routesV1.version)
export class CreateUserHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @ApiOperation({ summary: "Create a user" })
  @ApiResponse({ status: HttpStatus.OK, type: IdResponse })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: UserAlreadyExistsError.message,
    type: ApiErrorResponse,
  })
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
```

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
