import { DynamicModule, Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";
import { HealthController } from "./health.controller";
import { SlonikHealthIndicator } from "./slonik-health.indicator";
import { AppHealthIndicator, AppHealthOptions } from "./app-health.indicator";
import { DatabasePool } from "slonik";

export interface HealthModuleOptions extends AppHealthOptions {}

@Module({})
export class HealthModule {
  static forRoot(
    poolToken: symbol,
    options: HealthModuleOptions,
  ): DynamicModule {
    return {
      module: HealthModule,
      imports: [TerminusModule],
      controllers: [HealthController],
      providers: [
        {
          provide: SlonikHealthIndicator,
          useFactory: (pool: DatabasePool) => new SlonikHealthIndicator(pool),
          inject: [poolToken],
        },
        {
          provide: AppHealthIndicator,
          useFactory: () => new AppHealthIndicator(options),
        },
      ],
    };
  }
}
