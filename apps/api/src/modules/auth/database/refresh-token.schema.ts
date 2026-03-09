import { z } from 'zod';

export const refreshTokenSchema = z.object({
  id: z.uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  userId: z.string().min(1),
  tokenHash: z.string().min(1),
  expiresAt: z.coerce.date(),
  revokedAt: z.coerce.date().nullable(),
});

export type RefreshTokenModel = z.infer<typeof refreshTokenSchema>;
