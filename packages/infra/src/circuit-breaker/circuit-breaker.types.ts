export const CIRCUIT_BREAKER_OPTIONS = Symbol("CIRCUIT_BREAKER_OPTIONS");
export const CIRCUIT_BREAKER_SERVICE = Symbol("CIRCUIT_BREAKER_SERVICE");

/** Configuration options for the CircuitBreakerModule (opossum). */
export interface CircuitBreakerOptions {
  /** Timeout in milliseconds after which a request is considered failed. Default: 10000 (10s) */
  timeout?: number;
  /** Percentage of failures that will trip the circuit. Default: 50 */
  errorThresholdPercentage?: number;
  /** Time in milliseconds to wait before attempting to close the circuit. Default: 30000 (30s) */
  resetTimeout?: number;
}
