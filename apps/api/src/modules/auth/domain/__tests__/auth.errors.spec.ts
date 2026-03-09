import {
  InvalidCredentialsError,
  TokenExpiredError,
  TokenInvalidError,
} from '../auth.errors';

describe('Auth errors', () => {
  it('InvalidCredentialsError has correct code', () => {
    const error = new InvalidCredentialsError();
    expect(error.code).toBe('AUTH.INVALID_CREDENTIALS');
    expect(error.message).toBe('Invalid email or password');
  });

  it('TokenExpiredError has correct code', () => {
    const error = new TokenExpiredError();
    expect(error.code).toBe('AUTH.TOKEN_EXPIRED');
    expect(error.message).toBe('Token has expired');
  });

  it('TokenInvalidError has correct code', () => {
    const error = new TokenInvalidError();
    expect(error.code).toBe('AUTH.TOKEN_INVALID');
    expect(error.message).toBe('Token is invalid');
  });
});
