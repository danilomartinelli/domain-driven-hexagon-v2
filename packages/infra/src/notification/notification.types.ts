export const NOTIFICATION_PORT = Symbol("NOTIFICATION_PORT");
export const NOTIFICATION_OPTIONS = Symbol("NOTIFICATION_OPTIONS");

/** Configuration options for the NotificationModule. */
export interface NotificationOptions {
  /** Notification delivery driver. Default: 'console' */
  driver?: "console" | "email";
  /** SMTP host when using the email driver */
  smtpHost?: string;
  /** SMTP port when using the email driver */
  smtpPort?: number;
  /** SMTP username when using the email driver */
  smtpUser?: string;
  /** SMTP password when using the email driver */
  smtpPassword?: string;
  /** Sender address when using the email driver */
  fromAddress?: string;
}
