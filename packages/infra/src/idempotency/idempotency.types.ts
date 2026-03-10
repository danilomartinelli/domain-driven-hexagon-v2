export const IDEMPOTENCY_OPTIONS = Symbol("IDEMPOTENCY_OPTIONS");

export interface IdempotencyOptions {
  /** Time-to-live for idempotency keys in milliseconds. Default: 24 hours */
  ttlMs?: number;
}
