export const DEAD_LETTER_OPTIONS = Symbol("DEAD_LETTER_OPTIONS");

export interface DeadLetterOptions {
  /** Maximum number of retry attempts before marking as exhausted. Default: 5 */
  maxAttempts?: number;
  /** Base delay in milliseconds between retries (exponential backoff). Default: 60000 (1 minute) */
  baseRetryDelayMs?: number;
}
