import { DynamicModule, Module } from "@nestjs/common";
import { EVENT_BUS_PORT, EventBusModuleOptions } from "./event-bus.types";
import { InMemoryEventBusAdapter } from "./in-memory.adapter";
import { RedisPubSubAdapter } from "./redis-pubsub.adapter";

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
