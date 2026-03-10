import { DynamicModule, Module } from "@nestjs/common";
import { CircuitBreakerService } from "./circuit-breaker.service";
import {
  CircuitBreakerOptions,
  CIRCUIT_BREAKER_OPTIONS,
} from "./circuit-breaker.types";

@Module({})
export class CircuitBreakerModule {
  static forRoot(options?: CircuitBreakerOptions): DynamicModule {
    return {
      module: CircuitBreakerModule,
      global: true,
      providers: [
        CircuitBreakerService,
        {
          provide: CIRCUIT_BREAKER_OPTIONS,
          useValue: options ?? {},
        },
      ],
      exports: [CircuitBreakerService],
    };
  }
}
