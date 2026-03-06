import { WalletNotEnoughBalanceError } from './wallet.errors';

describe('WalletNotEnoughBalanceError', () => {
  it('has correct message', () => {
    const error = new WalletNotEnoughBalanceError();
    expect(error.message).toBe('Wallet has not enough balance');
  });

  it('has correct code', () => {
    const error = new WalletNotEnoughBalanceError();
    expect(error.code).toBe('WALLET.NOT_ENOUGH_BALANCE');
  });

  it('preserves metadata', () => {
    const error = new WalletNotEnoughBalanceError({
      balance: 0,
      requested: 100,
    });
    expect(error.metadata).toEqual({ balance: 0, requested: 100 });
  });
});
