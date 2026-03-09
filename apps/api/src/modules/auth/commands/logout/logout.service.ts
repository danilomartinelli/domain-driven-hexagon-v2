import { CommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { ok, Result } from 'neverthrow';
import { LogoutCommand } from './logout.command';
import { REFRESH_TOKEN_REPOSITORY } from '../../auth.di-tokens';
import { RefreshTokenRepositoryPort } from '../../database/refresh-token.repository.port';

@CommandHandler(LogoutCommand)
export class LogoutService {
  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepo: RefreshTokenRepositoryPort,
  ) {}

  async execute(command: LogoutCommand): Promise<Result<void, never>> {
    await this.refreshTokenRepo.revokeByUserId(command.userId);
    return ok(undefined);
  }
}
