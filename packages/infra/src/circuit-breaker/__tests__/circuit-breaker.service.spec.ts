import { CircuitBreakerService } from "../circuit-breaker.service";
import { CircuitBreakerOptions } from "../circuit-breaker.types";

function createService(
  options: CircuitBreakerOptions = {},
): CircuitBreakerService {
  return new CircuitBreakerService(options);
}

describe("CircuitBreakerService", () => {
  it("creates a named circuit breaker", () => {
    const service = createService();
    const breaker = service.getBreaker("test-circuit");

    expect(breaker).toBeDefined();
    expect(breaker.closed).toBe(true);
  });

  it("returns the same breaker instance for the same name", () => {
    const service = createService();
    const first = service.getBreaker("same-name");
    const second = service.getBreaker("same-name");

    expect(first).toBe(second);
  });

  it("returns different breaker instances for different names", () => {
    const service = createService();
    const a = service.getBreaker("circuit-a");
    const b = service.getBreaker("circuit-b");

    expect(a).not.toBe(b);
  });

  it("executes a function through the circuit breaker successfully", async () => {
    const service = createService();
    const result = await service.exec("success-circuit", async () => 42);

    expect(result).toBe(42);
  });

  it("propagates errors from the executed function", async () => {
    const service = createService();

    await expect(
      service.exec("error-circuit", async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
  });

  it("opens circuit after threshold failures", async () => {
    const service = createService({
      errorThresholdPercentage: 1, // trip after any failure percentage
      resetTimeout: 30_000,
    });

    const circuitName = "threshold-circuit";
    const failingFn = async (): Promise<void> => {
      throw new Error("failure");
    };

    // Fire enough failures to trip the circuit.
    // volumeThreshold defaults to 5 in opossum, so we need at least 5.
    for (let i = 0; i < 10; i++) {
      try {
        await service.exec(circuitName, failingFn);
      } catch {
        // expected
      }
    }

    expect(service.isOpen(circuitName)).toBe(true);

    // Subsequent calls should fail fast with circuit open error
    await expect(
      service.exec(circuitName, async () => "should-not-run"),
    ).rejects.toThrow(/Breaker is open/);
  });

  it("uses custom options when provided", () => {
    const service = createService({ timeout: 5000 });
    const breaker = service.getBreaker("custom-opts", {
      resetTimeout: 60_000,
    });

    expect(breaker).toBeDefined();
    expect(breaker.closed).toBe(true);
  });

  it("returns stats for an existing circuit", async () => {
    const service = createService();
    await service.exec("stats-circuit", async () => "ok");

    const stats = service.getStats("stats-circuit");
    expect(stats).toBeDefined();
    expect(stats!.successes).toBeGreaterThanOrEqual(1);
  });

  it("returns undefined stats for a non-existent circuit", () => {
    const service = createService();
    expect(service.getStats("no-such-circuit")).toBeUndefined();
  });

  it("isOpen returns false for a healthy circuit", async () => {
    const service = createService();
    await service.exec("healthy-circuit", async () => "ok");

    expect(service.isOpen("healthy-circuit")).toBe(false);
  });

  it("isOpen returns false for a non-existent circuit", () => {
    const service = createService();
    expect(service.isOpen("nope")).toBe(false);
  });
});
