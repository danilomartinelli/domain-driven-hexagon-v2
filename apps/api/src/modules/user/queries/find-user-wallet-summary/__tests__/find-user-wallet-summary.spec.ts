import { defineFeature, loadFeature } from 'jest-cucumber';
import {
  FindUserWalletSummaryQuery,
  FindUserWalletSummaryQueryHandler,
} from '../find-user-wallet-summary.query-handler';

const feature = loadFeature(
  'src/modules/user/queries/find-user-wallet-summary/__tests__/find-user-wallet-summary.feature',
);

defineFeature(feature, (test) => {
  let handler: FindUserWalletSummaryQueryHandler;
  let mockPool: { maybeOne: jest.Mock };
  let result: any;

  const mockSummary = {
    id: 'user-123',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    userId: 'user-123',
    email: 'test@example.com',
    country: 'England',
    walletId: 'wallet-456',
    balance: 1000,
  };

  beforeEach(() => {
    mockPool = {
      maybeOne: jest.fn(),
    };
    handler = new FindUserWalletSummaryQueryHandler(mockPool as any);
  });

  test('Successfully finding a user wallet summary', ({
    given,
    when,
    then,
  }) => {
    given(/^a user wallet summary exists for user "(.*)"$/, () => {
      mockPool.maybeOne.mockResolvedValue(mockSummary);
    });

    when(
      /^I execute the find user wallet summary query for "(.*)"$/,
      async (userId: string) => {
        const query = new FindUserWalletSummaryQuery({ userId });
        result = await handler.execute(query);
      },
    );

    then('the result is ok with the wallet summary', () => {
      expect(result.isOk()).toBe(true);
      const summary = result._unsafeUnwrap();
      expect(summary).toEqual(mockSummary);
    });
  });

  test('Returning null when no summary exists', ({ given, when, then }) => {
    given(/^no user wallet summary exists for user "(.*)"$/, () => {
      mockPool.maybeOne.mockResolvedValue(null);
    });

    when(
      /^I execute the find user wallet summary query for "(.*)"$/,
      async (userId: string) => {
        const query = new FindUserWalletSummaryQuery({ userId });
        result = await handler.execute(query);
      },
    );

    then('the result is ok with null', () => {
      expect(result.isOk()).toBe(true);
      const summary = result._unsafeUnwrap();
      expect(summary).toBeNull();
    });
  });
});
