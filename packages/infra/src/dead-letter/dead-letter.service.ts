import { Inject, Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { randomUUID } from "crypto";
import { DeadLetterRepository } from "./dead-letter.repository";
import { DeadLetterOptions, DEAD_LETTER_OPTIONS } from "./dead-letter.types";

@Injectable()
export class DeadLetterService {
  private readonly logger = new Logger(DeadLetterService.name);

  constructor(
    private readonly repository: DeadLetterRepository,
    @Inject(DEAD_LETTER_OPTIONS)
    private readonly options: DeadLetterOptions,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async recordFailure(
    eventName: string,
    payload: unknown,
    error: Error,
  ): Promise<void> {
    const id = randomUUID();
    const nextRetryAt = new Date(
      Date.now() + (this.options.baseRetryDelayMs ?? 60_000),
    );

    await this.repository.insert({
      id,
      eventName,
      payload,
      error: error.message,
      attempts: 1,
      maxAttempts: this.options.maxAttempts ?? 5,
      nextRetryAt,
      status: "pending_retry",
    });

    this.logger.warn(
      `Recorded failed event "${eventName}" (id=${id}): ${error.message}`,
    );
  }

  async retryFailedEvents(): Promise<{
    succeeded: number;
    failed: number;
    exhausted: number;
  }> {
    const pending = await this.repository.findPendingRetries();
    let succeeded = 0;
    let failed = 0;
    let exhausted = 0;

    for (const event of pending) {
      try {
        await this.eventEmitter.emitAsync(event.eventName, event.payload);
        await this.repository.markResolved(event.id);
        succeeded++;
        this.logger.log(
          `Successfully retried event "${event.eventName}" (id=${event.id})`,
        );
      } catch (retryError: any) {
        const newAttempts = event.attempts + 1;

        if (newAttempts >= event.maxAttempts) {
          await this.repository.updateStatus(
            event.id,
            "exhausted",
            newAttempts,
            null,
          );
          exhausted++;
          this.logger.error(
            `Event "${event.eventName}" (id=${event.id}) exhausted after ${newAttempts} attempts`,
          );
        } else {
          const delay =
            (this.options.baseRetryDelayMs ?? 60_000) *
            Math.pow(2, newAttempts - 1);
          const nextRetryAt = new Date(Date.now() + delay);
          await this.repository.updateStatus(
            event.id,
            "pending_retry",
            newAttempts,
            nextRetryAt,
          );
          failed++;
          this.logger.warn(
            `Retry failed for event "${event.eventName}" (id=${event.id}), attempt ${newAttempts}/${event.maxAttempts}`,
          );
        }
      }
    }

    return { succeeded, failed, exhausted };
  }
}
