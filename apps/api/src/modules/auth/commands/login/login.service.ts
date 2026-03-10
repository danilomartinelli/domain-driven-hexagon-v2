import { CommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';
import { LoginCommand } from './login.command';
import { HashedPassword } from '../../domain/value-objects/hashed-password.value-object';
import { InvalidCredentialsError } from '../../domain/auth.errors';
import { UserRepositoryPort } from '@modules/user/database/user.repository.port';
import { USER_REPOSITORY } from '@modules/user/user.di-tokens';
import { TokenService } from '../../application/token.service';
import { AuthTokens } from '../../domain/auth.types';

@CommandHandler(LoginCommand)
export class LoginService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepositoryPort,
    private readonly tokenService: TokenService,
  ) {}

  async execute(
    command: LoginCommand,
  ): Promise<Result<AuthTokens, InvalidCredentialsError>> {
    const user = await this.userRepo.findOneByEmail(command.email);

    if (!user) {
      return err(new InvalidCredentialsError());
    }

    const props = user.getProps();
    const hashedPassword = HashedPassword.fromHash(props.passwordHash);
    const isValid = await hashedPassword.verify(command.password);

    if (!isValid) {
      return err(new InvalidCredentialsError());
    }

    const tokens = await this.tokenService.generateTokens(
      props.id,
      props.email,
      props.role,
    );
    return ok(tokens);
  }
}
