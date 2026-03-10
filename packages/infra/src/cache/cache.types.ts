export const CACHE_PORT = Symbol("CACHE_PORT");
export const CACHE_OPTIONS = Symbol("CACHE_OPTIONS");
export const CACHE_SERVICE = Symbol("CACHE_SERVICE");

/** Configuration options for the CacheModule. */
export interface CacheOptions {
  /** Cache backend driver. Default: 'memory' */
  driver?: "memory" | "redis";
  /** Default time-to-live in seconds for cached entries. Default: 300 (5 min) */
  defaultTtlSeconds?: number;
  /** Redis host when using the redis driver */
  redisHost?: string;
  /** Redis port when using the redis driver */
  redisPort?: number;
  /** Redis password when using the redis driver */
  redisPassword?: string;
}
