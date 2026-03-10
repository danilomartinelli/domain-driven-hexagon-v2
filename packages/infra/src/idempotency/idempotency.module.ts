import { DynamicModule, Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { IdempotencyRepository } from "./idempotency.repository";
import { IdempotencyInterceptor } from "./idempotency.interceptor";
import { IdempotencyOptions, IDEMPOTENCY_OPTIONS } from "./idempotency.types";

@Module({})
export class IdempotencyModule {
  static forRoot(options?: IdempotencyOptions): DynamicModule {
    return {
      module: IdempotencyModule,
      global: true,
      providers: [
        IdempotencyRepository,
        {
          provide: APP_INTERCEPTOR,
          useClass: IdempotencyInterceptor,
        },
        {
          provide: IDEMPOTENCY_OPTIONS,
          useValue: options ?? {},
        },
      ],
    };
  }
}
