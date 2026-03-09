import { CommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { err, ok, Result } from 'neverthrow';
import { createHash, randomUUID } from 'crypto';
import { RefreshTokenCommand } from './refresh-token.command';
import { REFRESH_TOKEN_REPOSITORY } from '../../auth.di-tokens';
import { RefreshTokenRepositoryPort } from '../../database/refresh-token.repository.port';
import { TokenInvalidError } from '../../domain/auth.errors';
import { AuthTokens } from '../register/register.service';
import { USER_REPOSITORY } from '@modules/user/user.di-tokens';
import { UserRepositoryPort } from '@modules/user/database/user.repository.port';

@CommandHandler(RefreshTokenCommand)
export class RefreshTokenService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepositoryPort,
    private readonly jwtService: JwtService,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepo: RefreshTokenRepositoryPort,
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

    // Revoke old token
    await this.refreshTokenRepo.revokeByTokenHash(tokenHash);

    // Generate new tokens
    const props = user.getProps();
    const accessToken = this.jwtService.sign({
      sub: props.id,
      email: props.email,
      role: props.role,
    });

    const newRefreshToken = randomUUID();
    const newTokenHash = createHash('sha256')
      .update(newRefreshToken)
      .digest('hex');
    const now = new Date();

    await this.refreshTokenRepo.insert({
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
      userId: existingToken.userId,
      tokenHash: newTokenHash,
      expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days
      revokedAt: null,
    });

    return ok({
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn: 3600,
    });
  }
}
