import { RefreshTokenModel } from './refresh-token.schema';

export interface RefreshTokenRepositoryPort {
  insert(model: RefreshTokenModel): Promise<void>;
  findByTokenHash(tokenHash: string): Promise<RefreshTokenModel | null>;
  revokeByUserId(userId: string): Promise<void>;
  revokeByTokenHash(tokenHash: string): Promise<void>;
  deleteExpired(): Promise<number>;
}
