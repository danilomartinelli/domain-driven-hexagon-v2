import { AppHealthIndicator } from "../app-health.indicator";

describe("AppHealthIndicator", () => {
  let indicator: AppHealthIndicator;

  beforeEach(() => {
    indicator = new AppHealthIndicator({ version: "1.2.3" });
  });

  it("returns app info with status up", () => {
    const result = indicator.getAppInfo("app");

    expect(result.app.status).toBe("up");
  });

  it("includes version from options", () => {
    const result = indicator.getAppInfo("app");

    expect(result.app.version).toBe("1.2.3");
  });

  it("includes uptime as a number", () => {
    const result = indicator.getAppInfo("app");

    expect(typeof result.app.uptime).toBe("number");
    expect(result.app.uptime).toBeGreaterThanOrEqual(0);
  });

  it("includes environment from NODE_ENV", () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "test";

    const result = indicator.getAppInfo("app");

    expect(result.app.environment).toBe("test");
    process.env.NODE_ENV = originalEnv;
  });

  it("defaults environment to development when NODE_ENV is unset", () => {
    const originalEnv = process.env.NODE_ENV;
    delete process.env.NODE_ENV;

    const result = indicator.getAppInfo("app");

    expect(result.app.environment).toBe("development");
    process.env.NODE_ENV = originalEnv;
  });
});
