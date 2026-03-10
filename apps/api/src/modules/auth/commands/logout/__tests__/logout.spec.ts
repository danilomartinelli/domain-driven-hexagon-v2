import { LogoutService } from '../logout.service';
import { LogoutCommand } from '../logout.command';

describe('LogoutService', () => {
  let service: LogoutService;
  let mockRefreshTokenRepo: { revokeByUserId: jest.Mock };

  beforeEach(() => {
    mockRefreshTokenRepo = {
      revokeByUserId: jest.fn().mockResolvedValue(undefined),
    };
    service = new LogoutService(mockRefreshTokenRepo as any);
  });

  it('revokes all refresh tokens for the user', async () => {
    const command = new LogoutCommand({ userId: 'user-123' });
    const result = await service.execute(command);

    expect(result.isOk()).toBe(true);
    expect(mockRefreshTokenRepo.revokeByUserId).toHaveBeenCalledWith(
      'user-123',
    );
    expect(mockRefreshTokenRepo.revokeByUserId).toHaveBeenCalledTimes(1);
  });

  it('returns ok even when no tokens exist to revoke', async () => {
    mockRefreshTokenRepo.revokeByUserId.mockResolvedValue(undefined);

    const command = new LogoutCommand({ userId: 'user-with-no-tokens' });
    const result = await service.execute(command);

    expect(result.isOk()).toBe(true);
  });
});
