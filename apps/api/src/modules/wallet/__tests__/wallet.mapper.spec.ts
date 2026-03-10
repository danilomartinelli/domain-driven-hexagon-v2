import { WalletMapper } from '../wallet.mapper';
import { WalletEntity } from '../domain/wallet.entity';
import { WalletModel } from '../database/wallet.schema';
import { WalletResponseDto } from '../dtos/wallet.response.dto';

const TEST_USER_ID = '660e8400-e29b-41d4-a716-446655440001';
const TEST_WALLET_ID = '550e8400-e29b-41d4-a716-446655440000';

describe('WalletMapper', () => {
  const mapper = new WalletMapper();

  describe('toPersistence', () => {
    it('converts entity to database model', () => {
      const wallet = WalletEntity.create({ userId: TEST_USER_ID });
      const model = mapper.toPersistence(wallet);

      expect(model.id).toBe(wallet.id);
      expect(model.userId).toBe(TEST_USER_ID);
      expect(model.balance).toBe(0);
      expect(model.createdAt).toBeInstanceOf(Date);
      expect(model.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('toDomain', () => {
    it('reconstructs entity from database model', () => {
      const now = new Date();
      const model: WalletModel = {
        id: TEST_WALLET_ID,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        userId: TEST_USER_ID,
        balance: 500,
      };

      const entity = mapper.toDomain(model);
      const props = entity.getProps();

      expect(entity.id).toBe(TEST_WALLET_ID);
      expect(props.userId).toBe(TEST_USER_ID);
      expect(props.balance).toBe(500);
    });

    it('reconstructed entity has no pending domain events', () => {
      const now = new Date();
      const model: WalletModel = {
        id: TEST_WALLET_ID,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        userId: TEST_USER_ID,
        balance: 0,
      };

      const entity = mapper.toDomain(model);
      expect(entity.domainEvents).toHaveLength(0);
    });
  });

  describe('toResponse', () => {
    it('maps entity to response DTO with whitelisted properties', () => {
      const entity = new WalletEntity({
        id: TEST_WALLET_ID,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
        props: { userId: TEST_USER_ID, balance: 500 },
      });
      const response = mapper.toResponse(entity);
      expect(response).toBeInstanceOf(WalletResponseDto);
      expect(response.id).toBe(TEST_WALLET_ID);
      expect(response.userId).toBe(TEST_USER_ID);
      expect(response.balance).toBe(500);
    });
  });

  describe('round-trip', () => {
    it('entity → persistence → domain preserves all data', () => {
      const original = WalletEntity.create({ userId: TEST_USER_ID });
      const model = mapper.toPersistence(original);
      const restored = mapper.toDomain(model);

      expect(restored.id).toBe(original.id);
      expect(restored.getProps().userId).toBe(original.getProps().userId);
      expect(restored.getProps().balance).toBe(original.getProps().balance);
    });
  });
});
