import { z } from "zod";

export const outboxSchema = z.object({
  id: z.uuid(),
  createdAt: z.coerce.date(),
  eventName: z.string(),
  payload: z.unknown(),
  publishedAt: z.coerce.date().nullable(),
});

export type OutboxModel = z.infer<typeof outboxSchema>;
