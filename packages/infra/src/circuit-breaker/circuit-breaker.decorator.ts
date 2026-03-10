import CircuitBreaker from "opossum";
import { CircuitBreakerService } from "./circuit-breaker.service";
import { CIRCUIT_BREAKER_SERVICE } from "./circuit-breaker.types";

/**
 * Method decorator that wraps the decorated method's execution
 * through a named circuit breaker.
 *
 * The host class must store a `CircuitBreakerService` reference at
 * the `CIRCUIT_BREAKER_SERVICE` symbol key. If the reference is
 * missing at call time, the original method executes without
 * circuit-breaker protection.
 *
 * @param name - Unique name for the circuit breaker instance
 * @param options - Optional per-circuit opossum overrides
 */
export function UseCircuitBreaker(
  name: string,
  options?: Partial<CircuitBreaker.Options>,
): MethodDecorator {
  return (
    _target: object,
    _propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]): Promise<any> {
      const service: CircuitBreakerService | undefined = (this as any)[
        CIRCUIT_BREAKER_SERVICE
      ];

      if (!service) {
        return originalMethod.apply(this, args);
      }

      return service.exec(
        name,
        () => originalMethod.apply(this, args),
        options,
      );
    };

    return descriptor;
  };
}
