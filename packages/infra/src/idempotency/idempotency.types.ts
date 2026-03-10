export const IDEMPOTENCY_OPTIONS = Symbol("IDEMPOTENCY_OPTIONS");

/** Configuration options for the IdempotencyModule. */
export interface IdempotencyOptions {
  /** Time-to-live for idempotency keys in milliseconds. Default: 24 hours */
  ttlMs?: number;
}
