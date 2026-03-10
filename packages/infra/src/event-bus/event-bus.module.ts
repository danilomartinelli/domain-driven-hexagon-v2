import { DynamicModule, Module } from "@nestjs/common";
import { EVENT_BUS_PORT } from "./event-bus.port";
import { InMemoryEventBusAdapter } from "./in-memory.adapter";
import { RedisPubSubAdapter, RedisPubSubOptions } from "./redis-pubsub.adapter";

export interface EventBusModuleOptions {
  adapter: "in-memory" | "redis";
  redis?: RedisPubSubOptions;
}

@Module({})
export class EventBusModule {
  static forRoot(options?: EventBusModuleOptions): DynamicModule {
    const adapter = options?.adapter ?? "in-memory";

    const providers =
      adapter === "redis" && options?.redis
        ? [
            {
              provide: EVENT_BUS_PORT,
              useFactory: (): RedisPubSubAdapter => {
                return new RedisPubSubAdapter(options.redis!);
              },
            },
          ]
        : [
            {
              provide: EVENT_BUS_PORT,
              useClass: InMemoryEventBusAdapter,
            },
          ];

    return {
      module: EventBusModule,
      global: true,
      providers,
      exports: [EVENT_BUS_PORT],
    };
  }
}
