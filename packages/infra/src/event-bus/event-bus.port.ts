export interface EventBusPort {
  publish(eventName: string, payload: unknown): Promise<void>;
  subscribe(
    eventName: string,
    handler: (payload: unknown) => Promise<void>,
  ): void;
}

export const EVENT_BUS_PORT = Symbol("EVENT_BUS_PORT");
