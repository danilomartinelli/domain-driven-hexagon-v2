import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";
import { EventBusPort } from "./event-bus.port";

export interface RedisPubSubOptions {
  host: string;
  port: number;
  password?: string;
}

@Injectable()
export class RedisPubSubAdapter implements EventBusPort, OnModuleDestroy {
  private readonly logger = new Logger(RedisPubSubAdapter.name);
  private readonly publisher: Redis;
  private readonly subscriber: Redis;

  constructor(options: RedisPubSubOptions) {
    const connectionOptions = {
      host: options.host,
      port: options.port,
      password: options.password || undefined,
      lazyConnect: true,
    };
    this.publisher = new Redis(connectionOptions);
    this.subscriber = new Redis(connectionOptions);
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([this.publisher.quit(), this.subscriber.quit()]);
  }

  async publish(eventName: string, payload: unknown): Promise<void> {
    const message = JSON.stringify(payload);
    await this.publisher.publish(eventName, message);
    this.logger.debug(`Published event "${eventName}" via Redis pub/sub`);
  }

  subscribe(
    eventName: string,
    handler: (payload: unknown) => Promise<void>,
  ): void {
    this.subscriber.subscribe(eventName).catch((err) => {
      this.logger.error(
        `Failed to subscribe to "${eventName}": ${err.message}`,
      );
    });

    this.subscriber.on("message", (channel: string, message: string) => {
      if (channel === eventName) {
        try {
          const payload = JSON.parse(message);
          handler(payload).catch((err) => {
            this.logger.error(
              `Handler error for "${eventName}": ${err.message}`,
            );
          });
        } catch (parseError: any) {
          this.logger.error(
            `Failed to parse message on "${eventName}": ${parseError.message}`,
          );
        }
      }
    });
  }
}
