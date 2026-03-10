import { z } from 'zod';

export const walletSchema = z.object({
  id: z.uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  deletedAt: z.coerce.date().nullable(),
  balance: z.number().min(0).max(9999999),
  userId: z.uuid(),
});

export type WalletModel = z.infer<typeof walletSchema>;
