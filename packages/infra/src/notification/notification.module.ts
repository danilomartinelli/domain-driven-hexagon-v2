import { DynamicModule, Module } from "@nestjs/common";
import {
  NOTIFICATION_PORT,
  NotificationOptions,
  NOTIFICATION_OPTIONS,
} from "./notification.types";
import { ConsoleNotificationAdapter } from "./console.adapter";
import { EmailNotificationAdapter } from "./email.adapter";

@Module({})
export class NotificationModule {
  static forRoot(options?: NotificationOptions): DynamicModule {
    const resolvedOptions = options ?? {};
    const driver = resolvedOptions.driver ?? "console";

    const adapterClass =
      driver === "email"
        ? EmailNotificationAdapter
        : ConsoleNotificationAdapter;

    return {
      module: NotificationModule,
      global: true,
      providers: [
        {
          provide: NOTIFICATION_OPTIONS,
          useValue: resolvedOptions,
        },
        {
          provide: NOTIFICATION_PORT,
          useClass: adapterClass,
        },
      ],
      exports: [NOTIFICATION_PORT],
    };
  }
}
