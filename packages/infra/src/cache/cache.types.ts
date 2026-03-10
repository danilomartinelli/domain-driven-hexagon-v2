export interface CacheOptions {
  driver?: "memory" | "redis";
  defaultTtlSeconds?: number; // default 300 (5 min)
  redisHost?: string;
  redisPort?: number;
  redisPassword?: string;
}
