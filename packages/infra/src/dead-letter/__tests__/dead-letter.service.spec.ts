import { DeadLetterService } from "../dead-letter.service";
import { DeadLetterRepository } from "../dead-letter.repository";
import { DeadLetterOptions } from "../dead-letter.types";
import { FailedEventModel } from "../dead-letter.schema";

function createMockRepository(): jest.Mocked<
  Pick<
    DeadLetterRepository,
    "insert" | "findPendingRetries" | "updateStatus" | "markResolved"
  >
> {
  return {
    insert: jest.fn().mockResolvedValue(undefined),
    findPendingRetries: jest.fn().mockResolvedValue([]),
    updateStatus: jest.fn().mockResolvedValue(undefined),
    markResolved: jest.fn().mockResolvedValue(undefined),
  };
}

function createMockEventEmitter(): { emitAsync: jest.Mock } {
  return {
    emitAsync: jest.fn().mockResolvedValue([]),
  };
}

function createService(
  options: DeadLetterOptions = {},
  repo = createMockRepository(),
  emitter = createMockEventEmitter(),
): {
  service: DeadLetterService;
  repo: ReturnType<typeof createMockRepository>;
  emitter: ReturnType<typeof createMockEventEmitter>;
} {
  const service = new DeadLetterService(repo as any, options, emitter as any);
  return { service, repo, emitter };
}

function createPendingEvent(
  overrides: Partial<FailedEventModel> = {},
): FailedEventModel {
  return {
    id: "evt-1",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    eventName: "UserCreatedDomainEvent",
    payload: { aggregateId: "user-1" },
    error: "Connection refused",
    attempts: 1,
    maxAttempts: 5,
    nextRetryAt: new Date("2026-01-01T00:01:00Z"),
    status: "pending_retry",
    ...overrides,
  };
}

describe("DeadLetterService", () => {
  describe("recordFailure", () => {
    it("records a failure with correct fields", async () => {
      const { service, repo } = createService({
        maxAttempts: 3,
        baseRetryDelayMs: 30_000,
      });

      const error = new Error("Something went wrong");
      await service.recordFailure(
        "UserCreatedDomainEvent",
        { userId: "123" },
        error,
      );

      expect(repo.insert).toHaveBeenCalledTimes(1);
      const insertArg = repo.insert.mock.calls[0][0];

      expect(insertArg.id).toBeDefined();
      expect(insertArg.eventName).toBe("UserCreatedDomainEvent");
      expect(insertArg.payload).toEqual({ userId: "123" });
      expect(insertArg.error).toBe("Something went wrong");
      expect(insertArg.attempts).toBe(1);
      expect(insertArg.maxAttempts).toBe(3);
      expect(insertArg.status).toBe("pending_retry");
      expect(insertArg.nextRetryAt).toBeInstanceOf(Date);
    });

    it("uses default maxAttempts and retry delay when no options provided", async () => {
      const { service, repo } = createService({});

      const now = Date.now();
      const error = new Error("fail");
      await service.recordFailure("SomeEvent", {}, error);

      const insertArg = repo.insert.mock.calls[0][0];
      expect(insertArg.maxAttempts).toBe(5);

      // nextRetryAt should be approximately now + 60000ms (default base delay)
      expect(insertArg.nextRetryAt).not.toBeNull();
      const retryTime = (insertArg.nextRetryAt as Date).getTime();
      expect(retryTime).toBeGreaterThanOrEqual(now + 59_000);
      expect(retryTime).toBeLessThanOrEqual(now + 62_000);
    });
  });

  describe("retryFailedEvents", () => {
    it("emits event via EventEmitter2 on retry", async () => {
      const repo = createMockRepository();
      const emitter = createMockEventEmitter();
      const pendingEvent = createPendingEvent();
      repo.findPendingRetries.mockResolvedValue([pendingEvent]);

      const { service } = createService({}, repo, emitter);
      await service.retryFailedEvents();

      expect(emitter.emitAsync).toHaveBeenCalledWith("UserCreatedDomainEvent", {
        aggregateId: "user-1",
      });
    });

    it("marks event resolved on successful retry", async () => {
      const repo = createMockRepository();
      const emitter = createMockEventEmitter();
      const pendingEvent = createPendingEvent();
      repo.findPendingRetries.mockResolvedValue([pendingEvent]);

      const { service } = createService({}, repo, emitter);
      const result = await service.retryFailedEvents();

      expect(repo.markResolved).toHaveBeenCalledWith("evt-1");
      expect(result.succeeded).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.exhausted).toBe(0);
    });

    it("increments attempts and updates nextRetryAt on failed retry", async () => {
      const repo = createMockRepository();
      const emitter = createMockEventEmitter();
      emitter.emitAsync.mockRejectedValue(new Error("still broken"));

      const pendingEvent = createPendingEvent({ attempts: 2, maxAttempts: 5 });
      repo.findPendingRetries.mockResolvedValue([pendingEvent]);

      const { service } = createService(
        { baseRetryDelayMs: 1000 },
        repo,
        emitter,
      );
      const now = Date.now();
      const result = await service.retryFailedEvents();

      expect(repo.updateStatus).toHaveBeenCalledTimes(1);
      const [id, status, attempts, nextRetryAt] =
        repo.updateStatus.mock.calls[0];

      expect(id).toBe("evt-1");
      expect(status).toBe("pending_retry");
      expect(attempts).toBe(3); // 2 + 1

      // Exponential backoff: 1000 * 2^(3-1) = 4000ms
      expect(nextRetryAt).not.toBeNull();
      const retryTime = (nextRetryAt as Date).getTime();
      expect(retryTime).toBeGreaterThanOrEqual(now + 3_500);
      expect(retryTime).toBeLessThanOrEqual(now + 5_000);

      expect(result.failed).toBe(1);
      expect(result.succeeded).toBe(0);
      expect(result.exhausted).toBe(0);
    });

    it("marks event exhausted when max attempts reached", async () => {
      const repo = createMockRepository();
      const emitter = createMockEventEmitter();
      emitter.emitAsync.mockRejectedValue(new Error("still broken"));

      const pendingEvent = createPendingEvent({
        attempts: 4,
        maxAttempts: 5,
      });
      repo.findPendingRetries.mockResolvedValue([pendingEvent]);

      const { service } = createService({}, repo, emitter);
      const result = await service.retryFailedEvents();

      expect(repo.updateStatus).toHaveBeenCalledWith(
        "evt-1",
        "exhausted",
        5, // 4 + 1 >= maxAttempts (5)
        null,
      );
      expect(result.exhausted).toBe(1);
      expect(result.succeeded).toBe(0);
      expect(result.failed).toBe(0);
    });

    it("returns correct success/failure/exhausted counts for mixed results", async () => {
      const repo = createMockRepository();
      const emitter = createMockEventEmitter();

      const successEvent = createPendingEvent({
        id: "evt-success",
        eventName: "SuccessEvent",
      });
      const failEvent = createPendingEvent({
        id: "evt-fail",
        eventName: "FailEvent",
        attempts: 1,
        maxAttempts: 5,
      });
      const exhaustedEvent = createPendingEvent({
        id: "evt-exhausted",
        eventName: "ExhaustedEvent",
        attempts: 4,
        maxAttempts: 5,
      });

      repo.findPendingRetries.mockResolvedValue([
        successEvent,
        failEvent,
        exhaustedEvent,
      ]);

      emitter.emitAsync
        .mockResolvedValueOnce([]) // success
        .mockRejectedValueOnce(new Error("fail")) // fail (still has retries)
        .mockRejectedValueOnce(new Error("exhausted")); // exhausted

      const { service } = createService({}, repo, emitter);
      const result = await service.retryFailedEvents();

      expect(result.succeeded).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.exhausted).toBe(1);
    });

    it("returns zeroes when no pending events exist", async () => {
      const { service } = createService();
      const result = await service.retryFailedEvents();

      expect(result).toEqual({ succeeded: 0, failed: 0, exhausted: 0 });
    });
  });
});
