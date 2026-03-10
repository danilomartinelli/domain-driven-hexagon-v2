import { CachePort } from "./cache.port";
import { CACHE_SERVICE } from "./cache.types";

export interface CacheableOptions {
  /** Cache key template, e.g. 'users:{0}' where {0} is replaced with the first argument */
  key: string;
  /** TTL in seconds; falls back to the adapter's default if omitted */
  ttlSeconds?: number;
}

/**
 * Builds a concrete cache key by replacing `{0}`, `{1}`, ... placeholders
 * with the corresponding method arguments.
 */
function buildCacheKey(template: string, args: any[]): string {
  return template.replace(/\{(\d+)\}/g, (_match, index) => {
    const i = parseInt(index, 10);
    const value = args[i];
    return value !== undefined && value !== null ? String(value) : "";
  });
}

/**
 * Method decorator that caches the return value of the decorated method.
 *
 * The host class must store a `CachePort` reference at the `CACHE_SERVICE`
 * symbol key. If the reference is missing at call time, the original method
 * executes without caching (graceful degradation).
 *
 * @param options - Cache key template and optional TTL
 */
export function Cacheable(options: CacheableOptions): MethodDecorator {
  return (
    _target: object,
    _propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]): Promise<any> {
      const cacheService: CachePort | undefined = (this as any)[CACHE_SERVICE];

      if (!cacheService) {
        return originalMethod.apply(this, args);
      }

      const cacheKey = buildCacheKey(options.key, args);

      try {
        const cached = await cacheService.get(cacheKey);

        if (cached !== null) {
          return cached;
        }
      } catch {
        // Cache read failed — fall through to execute method
      }

      const result = await originalMethod.apply(this, args);

      try {
        await cacheService.set(cacheKey, result, options.ttlSeconds);
      } catch {
        // Cache write failed — return result anyway
      }

      return result;
    };

    return descriptor;
  };
}
