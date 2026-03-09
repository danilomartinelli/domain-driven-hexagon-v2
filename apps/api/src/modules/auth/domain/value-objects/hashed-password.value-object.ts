import * as argon2 from 'argon2';
import { ArgumentOutOfRangeException } from '@repo/core';

export class HashedPassword {
  private constructor(private readonly hash: string) {}

  get value(): string {
    return this.hash;
  }

  static async create(plainPassword: string): Promise<HashedPassword> {
    if (plainPassword.length < 8) {
      throw new ArgumentOutOfRangeException(
        'Password must be at least 8 characters',
      );
    }
    const hash = await argon2.hash(plainPassword);
    return new HashedPassword(hash);
  }

  static fromHash(hash: string): HashedPassword {
    return new HashedPassword(hash);
  }

  async verify(plainPassword: string): Promise<boolean> {
    return argon2.verify(this.hash, plainPassword);
  }
}
