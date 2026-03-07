import { Controller, Get } from "@nestjs/common";
import { HealthCheck, HealthCheckService } from "@nestjs/terminus";
import { SlonikHealthIndicator } from "./slonik-health.indicator";
import { AppHealthIndicator } from "./app-health.indicator";

@Controller("health")
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: SlonikHealthIndicator,
    private readonly app: AppHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.isHealthy("database"),
      () => this.app.getAppInfo("app"),
    ]);
  }
}
