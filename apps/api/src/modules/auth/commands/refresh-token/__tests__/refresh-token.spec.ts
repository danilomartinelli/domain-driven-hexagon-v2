import { defineFeature, loadFeature } from 'jest-cucumber';
import { RefreshTokenService } from '../refresh-token.service';
import { RefreshTokenCommand } from '../refresh-token.command';
import { TokenInvalidError } from '../../../domain/auth.errors';
import { Result } from 'neverthrow';

const feature = loadFeature(
  'src/modules/auth/commands/refresh-token/__tests__/refresh-token.feature',
);

defineFeature(feature, (test) => {
  let service: RefreshTokenService;
  let mockUserRepo: { findOneById: jest.Mock };
  let mockJwtService: { sign: jest.Mock };
  let mockRefreshTokenRepo: {
    findByTokenHash: jest.Mock;
    revokeByTokenHash: jest.Mock;
    insert: jest.Mock;
    transaction: jest.Mock;
  };
  let result: Result<any, TokenInvalidError>;

  beforeEach(() => {
    mockUserRepo = {
      findOneById: jest.fn().mockResolvedValue({
        getProps: () => ({
          id: 'user-id',
          email: 'john@test.com',
          role: 'guest',
        }),
      }),
    };
    mockJwtService = { sign: jest.fn().mockReturnValue('new-access-token') };
    mockRefreshTokenRepo = {
      findByTokenHash: jest.fn(),
      revokeByTokenHash: jest.fn().mockResolvedValue(undefined),
      insert: jest.fn().mockResolvedValue(undefined),
      transaction: jest.fn((handler: () => Promise<any>) => handler()),
    };
    service = new RefreshTokenService(
      mockUserRepo as any,
      mockJwtService as any,
      mockRefreshTokenRepo as any,
    );
  });

  test('Successfully refreshing tokens', ({ given, when, then, and }) => {
    given('a valid refresh token exists', () => {
      mockRefreshTokenRepo.findByTokenHash.mockResolvedValue({
        id: 'token-id',
        userId: 'user-id',
        tokenHash: 'hashed',
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        revokedAt: null,
      });
    });

    when(
      'I execute the refresh token command with the valid token',
      async () => {
        result = await service.execute(
          new RefreshTokenCommand({ refreshToken: 'valid-uuid-token' }),
        );
      },
    );

    then('the result is ok with new access and refresh tokens', () => {
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.accessToken).toBeDefined();
        expect(result.value.refreshToken).toBeDefined();
        expect(result.value.expiresIn).toBe(3600);
      }
    });

    and('the old refresh token is revoked', () => {
      expect(mockRefreshTokenRepo.revokeByTokenHash).toHaveBeenCalled();
    });
  });

  test('Failing to refresh with invalid token', ({ given, when, then }) => {
    given('no matching refresh token exists', () => {
      mockRefreshTokenRepo.findByTokenHash.mockResolvedValue(null);
    });

    when(
      'I execute the refresh token command with an invalid token',
      async () => {
        result = await service.execute(
          new RefreshTokenCommand({ refreshToken: 'invalid-token' }),
        );
      },
    );

    then('the result is an error of type TokenInvalidError', () => {
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(TokenInvalidError);
      }
    });
  });

  test('Failing to refresh with expired token', ({ given, when, then }) => {
    given('an expired refresh token exists', () => {
      mockRefreshTokenRepo.findByTokenHash.mockResolvedValue(null); // findByTokenHash filters expired
    });

    when(
      'I execute the refresh token command with the expired token',
      async () => {
        result = await service.execute(
          new RefreshTokenCommand({ refreshToken: 'expired-token' }),
        );
      },
    );

    then('the result is an error of type TokenInvalidError', () => {
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(TokenInvalidError);
      }
    });
  });
});
