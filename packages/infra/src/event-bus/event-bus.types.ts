import type { RedisPubSubOptions } from "./redis-pubsub.adapter";

export const EVENT_BUS_PORT = Symbol("EVENT_BUS_PORT");

/** Configuration options for the EventBusModule. */
export interface EventBusModuleOptions {
  /** Event bus adapter to use */
  adapter: "in-memory" | "redis";
  /** Redis connection options when using the redis adapter */
  redis?: RedisPubSubOptions;
}
