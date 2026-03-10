import { ConsoleNotificationAdapter } from "../console.adapter";
import { NotificationPayload } from "../notification.port";

describe("ConsoleNotificationAdapter", () => {
  let adapter: ConsoleNotificationAdapter;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    adapter = new ConsoleNotificationAdapter();
    logSpy = jest
      .spyOn((adapter as any).logger, "log")
      .mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it("sends notification via logger", async () => {
    const notification: NotificationPayload = {
      channel: "email",
      recipient: "user@example.com",
      template: "welcome",
      data: { name: "John" },
    };

    await adapter.send(notification);

    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("user@example.com"),
    );
  });

  it("includes all notification fields", async () => {
    const notification: NotificationPayload = {
      channel: "push",
      recipient: "device-token-123",
      template: "order-update",
      data: { orderId: "abc", status: "shipped" },
    };

    await adapter.send(notification);

    const logMessage = logSpy.mock.calls[0][0];
    expect(logMessage).toContain("push");
    expect(logMessage).toContain("device-token-123");
    expect(logMessage).toContain("order-update");
    expect(logMessage).toContain("abc");
    expect(logMessage).toContain("shipped");
  });
});
