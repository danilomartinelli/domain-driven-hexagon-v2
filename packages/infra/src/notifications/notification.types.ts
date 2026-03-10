export interface NotificationOptions {
  driver?: "console" | "email"; // default 'console'
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  fromAddress?: string;
}

export const NOTIFICATION_OPTIONS = Symbol("NOTIFICATION_OPTIONS");
