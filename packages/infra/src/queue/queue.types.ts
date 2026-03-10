export const QUEUE_PORT = Symbol("QUEUE_PORT");
export const QUEUE_OPTIONS = Symbol("QUEUE_OPTIONS");

/** Configuration options for the QueueModule (BullMQ/Redis). */
export interface QueueOptions {
  /** Redis host for the BullMQ connection */
  redisHost: string;
  /** Redis port for the BullMQ connection */
  redisPort: number;
  /** Redis password for the BullMQ connection */
  redisPassword?: string;
}

/** Per-job options when enqueueing a task. */
export interface EnqueueOptions {
  /** Delay in milliseconds before the job becomes processable */
  delay?: number;
  /** Number of retry attempts on failure */
  attempts?: number;
  /** Backoff strategy for retries */
  backoff?: {
    type: "exponential" | "fixed";
    delay: number;
  };
  /** Job priority (lower value = higher priority) */
  priority?: number;
  /** Remove completed jobs (true, or max count to keep) */
  removeOnComplete?: boolean | number;
  /** Remove failed jobs (true, or max count to keep) */
  removeOnFail?: boolean | number;
}
