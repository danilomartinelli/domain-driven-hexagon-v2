import { Injectable } from "@nestjs/common";
import { NotificationPort, NotificationPayload } from "./notification.port";

/**
 * EmailNotificationAdapter is a placeholder/stub for SMTP-based email notifications.
 *
 * To use this adapter in production, install nodemailer:
 *   pnpm add nodemailer
 *   pnpm add -D @types/nodemailer
 *
 * Then replace the stub with a real implementation:
 *
 *   import { createTransport, Transporter } from 'nodemailer';
 *
 *   constructor(options: NotificationOptions) {
 *     this.transporter = createTransport({
 *       host: options.smtpHost,
 *       port: options.smtpPort ?? 587,
 *       auth: {
 *         user: options.smtpUser,
 *         pass: options.smtpPassword,
 *       },
 *     });
 *     this.fromAddress = options.fromAddress ?? 'noreply@example.com';
 *   }
 *
 *   async send(notification: NotificationPayload): Promise<void> {
 *     if (notification.channel !== 'email') {
 *       this.logger.warn(`Email adapter received non-email notification: ${notification.channel}`);
 *       return;
 *     }
 *     await this.transporter.sendMail({
 *       from: this.fromAddress,
 *       to: notification.recipient,
 *       subject: notification.template,
 *       html: renderTemplate(notification.template, notification.data),
 *     });
 *   }
 */
@Injectable()
export class EmailNotificationAdapter implements NotificationPort {
  async send(_notification: NotificationPayload): Promise<void> {
    throw new Error(
      "Email adapter requires nodemailer. Install it and configure.",
    );
  }
}
