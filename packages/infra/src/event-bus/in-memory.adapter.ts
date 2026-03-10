import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { EventBusPort } from "./event-bus.port";

@Injectable()
export class InMemoryEventBusAdapter implements EventBusPort {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  async publish(eventName: string, payload: unknown): Promise<void> {
    await this.eventEmitter.emitAsync(eventName, payload);
  }

  subscribe(
    eventName: string,
    handler: (payload: unknown) => Promise<void>,
  ): void {
    this.eventEmitter.on(eventName, handler);
  }
}
