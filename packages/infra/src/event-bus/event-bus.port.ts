export interface EventBusPort {
  publish(eventName: string, payload: unknown): Promise<void>;
  subscribe(
    eventName: string,
    handler: (payload: unknown) => Promise<void>,
  ): void;
}
