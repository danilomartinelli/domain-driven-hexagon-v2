export const QUEUE_OPTIONS = Symbol("QUEUE_OPTIONS");

export interface QueueOptions {
  redisHost: string;
  redisPort: number;
  redisPassword?: string;
}

export interface EnqueueOptions {
  delay?: number;
  attempts?: number;
  backoff?: {
    type: "exponential" | "fixed";
    delay: number;
  };
  priority?: number;
  removeOnComplete?: boolean | number;
  removeOnFail?: boolean | number;
}
