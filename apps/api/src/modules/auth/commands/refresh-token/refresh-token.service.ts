import { CommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';
import { createHash } from 'crypto';
import { RefreshTokenCommand } from './refresh-token.command';
import { REFRESH_TOKEN_REPOSITORY } from '../../auth.di-tokens';
import { RefreshTokenRepositoryPort } from '../../database/refresh-token.repository.port';
import { TokenInvalidError } from '../../domain/auth.errors';
import { AuthTokens } from '../../domain/auth.types';
import { USER_REPOSITORY } from '@modules/user/user.di-tokens';
import { UserRepositoryPort } from '@modules/user/database/user.repository.port';
import { TokenService } from '../../application/token.service';

@CommandHandler(RefreshTokenCommand)
export class RefreshTokenService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepositoryPort,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepo: RefreshTokenRepositoryPort,
    private readonly tokenService: TokenService,
  ) {}

  async execute(
    command: RefreshTokenCommand,
  ): Promise<Result<AuthTokens, TokenInvalidError>> {
    const tokenHash = createHash('sha256')
      .update(command.refreshToken)
      .digest('hex');

    const existingToken =
      await this.refreshTokenRepo.findByTokenHash(tokenHash);
    if (!existingToken) {
      return err(new TokenInvalidError());
    }

    const user = await this.userRepo.findOneById(existingToken.userId);
    if (!user) {
      return err(new TokenInvalidError());
    }

    // Revoke old token and generate new tokens atomically
    const props = user.getProps();
    const tokens = await this.refreshTokenRepo.transaction(async () => {
      await this.refreshTokenRepo.revokeByTokenHash(tokenHash);
      return this.tokenService.generateTokens(
        props.id,
        props.email,
        props.role,
      );
    });

    return ok(tokens);
  }
}
