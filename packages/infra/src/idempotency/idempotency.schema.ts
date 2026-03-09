import { z } from "zod";

export const idempotencyKeySchema = z.object({
  key: z.string(),
  responseStatus: z.number(),
  responseBody: z.unknown().nullable(),
  createdAt: z.coerce.date(),
  expiresAt: z.coerce.date(),
});

export type IdempotencyKeyModel = z.infer<typeof idempotencyKeySchema>;
