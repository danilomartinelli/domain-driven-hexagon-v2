import { CleanupScheduler } from "../cleanup.scheduler";

describe("CleanupScheduler", () => {
  let scheduler: CleanupScheduler;
  let mockIdempotencyRepo: { deleteExpired: jest.Mock };
  let mockDeadLetterService: { retryFailedEvents: jest.Mock };

  beforeEach(() => {
    mockIdempotencyRepo = {
      deleteExpired: jest.fn().mockResolvedValue(undefined),
    };
    mockDeadLetterService = {
      retryFailedEvents: jest.fn().mockResolvedValue({
        succeeded: 2,
        failed: 1,
        exhausted: 0,
      }),
    };
    scheduler = new CleanupScheduler(
      mockIdempotencyRepo as any,
      mockDeadLetterService as any,
    );
  });

  describe("cleanupExpiredIdempotencyKeys", () => {
    it("calls deleteExpired on the idempotency repository", async () => {
      await scheduler.cleanupExpiredIdempotencyKeys();

      expect(mockIdempotencyRepo.deleteExpired).toHaveBeenCalledTimes(1);
    });

    it("handles errors gracefully without throwing", async () => {
      mockIdempotencyRepo.deleteExpired.mockRejectedValue(
        new Error("DB connection failed"),
      );

      await expect(
        scheduler.cleanupExpiredIdempotencyKeys(),
      ).resolves.not.toThrow();
    });
  });

  describe("retryFailedEvents", () => {
    it("calls retryFailedEvents on the dead letter service", async () => {
      await scheduler.retryFailedEvents();

      expect(mockDeadLetterService.retryFailedEvents).toHaveBeenCalledTimes(1);
    });

    it("handles errors gracefully without throwing", async () => {
      mockDeadLetterService.retryFailedEvents.mockRejectedValue(
        new Error("Retry failed"),
      );

      await expect(scheduler.retryFailedEvents()).resolves.not.toThrow();
    });
  });
});
