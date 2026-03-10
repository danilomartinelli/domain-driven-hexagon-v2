import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID, createHash } from 'crypto';
import { REFRESH_TOKEN_REPOSITORY } from '../auth.di-tokens';
import { RefreshTokenRepositoryPort } from '../database/refresh-token.repository.port';
import { AuthTokens } from '../domain/auth.types';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepo: RefreshTokenRepositoryPort,
  ) {}

  async generateTokens(
    userId: string,
    email: string,
    role: string,
  ): Promise<AuthTokens> {
    const accessToken = this.jwtService.sign({ sub: userId, email, role });

    const refreshToken = randomUUID();
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
    const now = new Date();

    await this.refreshTokenRepo.insert({
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
      userId,
      tokenHash,
      expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days
      revokedAt: null,
    });

    return { accessToken, refreshToken, expiresIn: 3600 };
  }
}
