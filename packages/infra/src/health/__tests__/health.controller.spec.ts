import { Test } from "@nestjs/testing";
import { HealthController } from "../health.controller";
import { TerminusModule } from "@nestjs/terminus";
import { SlonikHealthIndicator } from "../slonik-health.indicator";
import { AppHealthIndicator } from "../app-health.indicator";

describe("HealthController", () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [TerminusModule],
      controllers: [HealthController],
      providers: [
        {
          provide: SlonikHealthIndicator,
          useValue: {
            isHealthy: jest.fn().mockResolvedValue({
              database: { status: "up" },
            }),
          },
        },
        {
          provide: AppHealthIndicator,
          useValue: {
            getAppInfo: jest.fn().mockReturnValue({
              app: {
                status: "up",
                uptime: 100,
                version: "2.0.0",
                environment: "test",
              },
            }),
          },
        },
      ],
    }).compile();

    controller = module.get(HealthController);
  });

  it("returns health check result with database and app info", async () => {
    const result = await controller.check();
    expect(result.status).toBe("ok");
    expect(result.info).toHaveProperty("database");
    expect(result.info).toHaveProperty("app");
  });
});
