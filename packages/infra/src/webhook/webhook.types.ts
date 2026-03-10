/** Configuration options for the WebhookModule. */
export interface WebhookOptions {
  /** Maximum delivery retry attempts. Default: 3 */
  maxRetries?: number;
  /** Delay between retries in milliseconds. Default: 5000 */
  retryDelayMs?: number;
  /** HTTP request timeout in milliseconds. Default: 10000 */
  timeoutMs?: number;
}

export const WEBHOOK_OPTIONS = Symbol("WEBHOOK_OPTIONS");
