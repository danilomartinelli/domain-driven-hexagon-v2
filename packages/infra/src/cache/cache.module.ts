import { DynamicModule, Module } from "@nestjs/common";
import { MemoryCacheAdapter } from "./memory-cache.adapter";
import { RedisCacheAdapter } from "./redis-cache.adapter";
import { CACHE_PORT, CacheOptions, CACHE_OPTIONS } from "./cache.types";

@Module({})
export class CacheModule {
  static forRoot(options?: CacheOptions): DynamicModule {
    const resolvedOptions: CacheOptions = options ?? {};

    return {
      module: CacheModule,
      global: true,
      providers: [
        {
          provide: CACHE_OPTIONS,
          useValue: resolvedOptions,
        },
        {
          provide: CACHE_PORT,
          useFactory: (opts: CacheOptions) => {
            if (opts.driver === "redis") {
              return new RedisCacheAdapter(opts);
            }
            return new MemoryCacheAdapter(opts);
          },
          inject: [CACHE_OPTIONS],
        },
      ],
      exports: [CACHE_PORT],
    };
  }
}
