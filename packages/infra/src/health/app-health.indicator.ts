import { Injectable } from "@nestjs/common";
import { HealthIndicator, HealthIndicatorResult } from "@nestjs/terminus";

export interface AppHealthOptions {
  version: string;
}

@Injectable()
export class AppHealthIndicator extends HealthIndicator {
  constructor(private readonly options: AppHealthOptions) {
    super();
  }

  getAppInfo(key: string): HealthIndicatorResult {
    return this.getStatus(key, true, {
      uptime: Math.floor(process.uptime()),
      version: this.options.version,
      environment: process.env.NODE_ENV ?? "development",
    });
  }
}
