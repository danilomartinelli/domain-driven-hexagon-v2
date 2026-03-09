import { defineFeature, loadFeature } from 'jest-cucumber';
import {
  FindUsersQuery,
  FindUsersQueryHandler,
} from '../find-users.query-handler';

const feature = loadFeature(
  'src/modules/user/queries/find-users/__tests__/find-users.feature',
);

defineFeature(feature, (test) => {
  let handler: FindUsersQueryHandler;
  let mockPool: { query: jest.Mock };
  let result: any;

  const mockUsers = [
    {
      id: 'user-1',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      email: 'john@test.com',
      country: 'England',
      postalCode: '28566',
      street: 'Grand Avenue',
      role: 'guest',
    },
  ];

  beforeEach(() => {
    mockPool = {
      query: jest.fn(),
    };
    handler = new FindUsersQueryHandler(mockPool as any);
  });

  test('Successfully finding users with filters', ({ given, when, then }) => {
    given('users exist in the database', () => {
      mockPool.query.mockResolvedValue({
        rows: mockUsers,
        rowCount: 1,
      });
    });

    when(
      /^I execute the find users query with country "(.*)"$/,
      async (country: string) => {
        const query = new FindUsersQuery({
          country,
          limit: 20,
          page: 1,
        });
        result = await handler.execute(query);
      },
    );

    then('the result is ok with paginated users filtered by country', () => {
      expect(result.isOk()).toBe(true);
      const paginated = result._unsafeUnwrap();
      expect(paginated.data).toHaveLength(1);
      expect(paginated.count).toBe(1);
    });
  });

  test('Returning empty results when no users match', ({
    given,
    when,
    then,
  }) => {
    given('no users exist matching the filter', () => {
      mockPool.query.mockResolvedValue({
        rows: [],
        rowCount: 0,
      });
    });

    when(
      /^I execute the find users query with country "(.*)"$/,
      async (country: string) => {
        const query = new FindUsersQuery({
          country,
          limit: 20,
          page: 1,
        });
        result = await handler.execute(query);
      },
    );

    then('the result is ok with an empty paginated list', () => {
      expect(result.isOk()).toBe(true);
      const paginated = result._unsafeUnwrap();
      expect(paginated.data).toHaveLength(0);
      expect(paginated.count).toBe(0);
    });
  });

  test('Pagination works correctly', ({ given, when, then }) => {
    given('users exist in the database', () => {
      mockPool.query.mockResolvedValue({
        rows: [mockUsers[0]],
        rowCount: 1,
      });
    });

    when(
      /^I execute the find users query with limit (\d+) and page (\d+)$/,
      async (limit: string, page: string) => {
        const query = new FindUsersQuery({
          limit: Number(limit),
          page: Number(page),
        });
        result = await handler.execute(query);
      },
    );

    then('the result is ok with paginated users respecting the limit', () => {
      expect(result.isOk()).toBe(true);
      const paginated = result._unsafeUnwrap();
      expect(paginated.limit).toBe(1);
      expect(paginated.page).toBe(1);
    });
  });
});
