import { CommandHandler } from '@nestjs/cqrs';
import { CommandBus } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';
import { RegisterCommand } from './register.command';
import { HashedPassword } from '../../domain/value-objects/hashed-password.value-object';
import { UserAlreadyExistsError } from '@modules/user/domain/user.errors';
import { CreateUserCommand } from '@modules/user/commands/create-user/create-user.command';
import { TokenService } from '../../application/token.service';
import { AuthTokens } from '../../domain/auth.types';

@CommandHandler(RegisterCommand)
export class RegisterService {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly tokenService: TokenService,
  ) {}

  async execute(
    command: RegisterCommand,
  ): Promise<Result<AuthTokens, UserAlreadyExistsError>> {
    const hashedPassword = await HashedPassword.create(command.password);

    const createUserCommand = new CreateUserCommand({
      email: command.email,
      country: command.country,
      postalCode: command.postalCode,
      street: command.street,
      passwordHash: hashedPassword.value,
    });

    const userResult = await this.commandBus.execute(createUserCommand);

    if (userResult.isErr()) {
      return err(userResult.error);
    }

    const userId = userResult.value;
    const tokens = await this.tokenService.generateTokens(
      userId,
      command.email,
      'guest',
    );
    return ok(tokens);
  }
}
