import { Inject, Injectable, Logger } from "@nestjs/common";
import CircuitBreaker from "opossum";
import { CircuitBreakerOptions } from "./circuit-breaker.types";

export const CIRCUIT_BREAKER_OPTIONS = "CIRCUIT_BREAKER_OPTIONS";

@Injectable()
export class CircuitBreakerService {
  private readonly breakers = new Map<string, CircuitBreaker>();
  private readonly logger = new Logger(CircuitBreakerService.name);

  constructor(
    @Inject(CIRCUIT_BREAKER_OPTIONS)
    private readonly defaults: CircuitBreakerOptions,
  ) {}

  /**
   * Retrieves or creates a named circuit breaker instance.
   * The breaker wraps a pass-through function; the actual work
   * is supplied at call time via `exec()`.
   */
  getBreaker(
    name: string,
    options?: Partial<CircuitBreaker.Options>,
  ): CircuitBreaker {
    if (!this.breakers.has(name)) {
      const breaker = new CircuitBreaker(
        async (fn: () => Promise<any>) => fn(),
        {
          timeout: this.defaults.timeout ?? 10_000,
          errorThresholdPercentage:
            this.defaults.errorThresholdPercentage ?? 50,
          resetTimeout: this.defaults.resetTimeout ?? 30_000,
          ...options,
        },
      );

      breaker.on("open", () => this.logger.warn(`Circuit "${name}" opened`));
      breaker.on("halfOpen", () =>
        this.logger.log(`Circuit "${name}" half-open`),
      );
      breaker.on("close", () => this.logger.log(`Circuit "${name}" closed`));

      this.breakers.set(name, breaker);
    }

    return this.breakers.get(name)!;
  }

  /**
   * Executes a function through a named circuit breaker.
   * If no breaker exists for the given name, one is created with the
   * provided options (or module defaults).
   */
  async exec<T>(
    name: string,
    fn: () => Promise<T>,
    options?: Partial<CircuitBreaker.Options>,
  ): Promise<T> {
    const breaker = this.getBreaker(name, options);
    return breaker.fire(fn) as Promise<T>;
  }

  /**
   * Returns the stats snapshot for a named circuit breaker,
   * or undefined if no breaker with that name exists.
   */
  getStats(name: string): CircuitBreaker.Stats | undefined {
    return this.breakers.get(name)?.stats;
  }

  /**
   * Returns true if the named circuit breaker is currently open (tripped).
   */
  isOpen(name: string): boolean {
    return this.breakers.get(name)?.opened ?? false;
  }
}
