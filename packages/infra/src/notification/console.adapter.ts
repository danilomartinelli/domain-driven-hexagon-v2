import { Injectable, Logger } from "@nestjs/common";
import { NotificationPort, NotificationPayload } from "./notification.port";

@Injectable()
export class ConsoleNotificationAdapter implements NotificationPort {
  private readonly logger = new Logger(ConsoleNotificationAdapter.name);

  async send(notification: NotificationPayload): Promise<void> {
    this.logger.log(
      `[${notification.channel}] To: ${notification.recipient} | Template: ${notification.template} | Data: ${JSON.stringify(notification.data)}`,
    );
  }
}
