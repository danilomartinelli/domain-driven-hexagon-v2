import { HashedPassword } from '../hashed-password.value-object';

describe('HashedPassword', () => {
  describe('create', () => {
    it('hashes a plain text password', async () => {
      const hashed = await HashedPassword.create('MySecureP@ss1');
      expect(hashed.value).toMatch(/^\$argon2/);
    });

    it('rejects passwords shorter than 8 characters', async () => {
      await expect(HashedPassword.create('short')).rejects.toThrow(
        'Password must be at least 8 characters',
      );
    });
  });

  describe('verify', () => {
    it('returns true for correct password', async () => {
      const hashed = await HashedPassword.create('MySecureP@ss1');
      const result = await hashed.verify('MySecureP@ss1');
      expect(result).toBe(true);
    });

    it('returns false for incorrect password', async () => {
      const hashed = await HashedPassword.create('MySecureP@ss1');
      const result = await hashed.verify('WrongPassword');
      expect(result).toBe(false);
    });
  });

  describe('fromHash', () => {
    it('creates a HashedPassword from an existing hash', async () => {
      const original = await HashedPassword.create('MySecureP@ss1');
      const restored = HashedPassword.fromHash(original.value);
      const result = await restored.verify('MySecureP@ss1');
      expect(result).toBe(true);
    });
  });
});
