import { Injectable, Logger } from "@nestjs/common";
import Redis from "ioredis";
import { CachePort } from "./cache.port";
import { CacheOptions } from "./cache.types";

const DEFAULT_TTL_SECONDS = 300;

@Injectable()
export class RedisCacheAdapter implements CachePort {
  private readonly logger = new Logger(RedisCacheAdapter.name);
  private readonly redis: Redis;
  private readonly defaultTtlSeconds: number;

  constructor(options: CacheOptions) {
    this.defaultTtlSeconds = options.defaultTtlSeconds ?? DEFAULT_TTL_SECONDS;
    this.redis = new Redis({
      host: options.redisHost ?? "localhost",
      port: options.redisPort ?? 6379,
      password: options.redisPassword || undefined,
      lazyConnect: true,
    });
  }

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.redis.get(key);

    if (raw === null) {
      return null;
    }

    try {
      return JSON.parse(raw) as T;
    } catch {
      this.logger.warn(`Failed to parse cached value for key "${key}"`);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds ?? this.defaultTtlSeconds;
    const serialized = JSON.stringify(value);

    await this.redis.set(key, serialized, "EX", ttl);
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);

    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
