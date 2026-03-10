import { z } from "zod";

export const failedEventSchema = z.object({
  id: z.uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  eventName: z.string(),
  payload: z.unknown(),
  error: z.string(),
  attempts: z.number(),
  maxAttempts: z.number(),
  nextRetryAt: z.coerce.date().nullable(),
  status: z.enum(["pending_retry", "exhausted", "resolved"]),
});

export type FailedEventModel = z.infer<typeof failedEventSchema>;
