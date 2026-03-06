import { defineFeature, loadFeature } from 'jest-cucumber';
import { CreateWalletWhenUserIsCreatedDomainEventHandler } from '../create-wallet-when-user-is-created.domain-event-handler';
import { UserCreatedDomainEvent } from '@modules/user/domain/events/user-created.domain-event';

const feature = loadFeature(
  'src/modules/wallet/application/event-handlers/__tests__/create-wallet-when-user-is-created.feature',
);

defineFeature(feature, (test) => {
  let handler: CreateWalletWhenUserIsCreatedDomainEventHandler;
  let mockRepo: { insert: jest.Mock };
  let event: UserCreatedDomainEvent;

  beforeEach(() => {
    mockRepo = {
      insert: jest.fn().mockResolvedValue(undefined),
    };
    handler = new CreateWalletWhenUserIsCreatedDomainEventHandler(
      mockRepo as any,
    );
  });

  test('Wallet is created after user registration', ({
    given,
    when,
    then,
  }) => {
    given(
      /^a UserCreatedDomainEvent is received for user "(.*)"$/,
      (userId: string) => {
        event = new UserCreatedDomainEvent({
          aggregateId: userId,
          email: 'test@example.com',
          country: 'England',
          postalCode: '28566',
          street: 'Grand Avenue',
        });
      },
    );

    when('the event handler processes the event', async () => {
      await handler.handle(event);
    });

    then(
      /^a wallet is created for user "(.*)"$/,
      (userId: string) => {
        expect(mockRepo.insert).toHaveBeenCalledTimes(1);
        const insertedWallet = mockRepo.insert.mock.calls[0][0];
        expect(insertedWallet.getProps().userId).toBe(userId);
        expect(insertedWallet.getProps().balance).toBe(0);
      },
    );
  });

  test('Repository failure during wallet creation', ({
    given,
    when,
    then,
    and,
  }) => {
    let thrownError: Error | undefined;

    given(
      /^a UserCreatedDomainEvent is received for user "(.*)"$/,
      (userId: string) => {
        event = new UserCreatedDomainEvent({
          aggregateId: userId,
          email: 'test@example.com',
          country: 'England',
          postalCode: '28566',
          street: 'Grand Avenue',
        });
      },
    );

    and('the wallet repository will throw an error', () => {
      mockRepo.insert.mockRejectedValue(new Error('DB unavailable'));
    });

    when('the event handler processes the event', async () => {
      try {
        await handler.handle(event);
      } catch (e) {
        thrownError = e as Error;
      }
    });

    then('the error is propagated from the handler', () => {
      expect(thrownError).toBeDefined();
      expect(thrownError!.message).toBe('DB unavailable');
    });
  });
});
