export interface NotificationPayload {
  channel: "email" | "push" | "in-app";
  recipient: string;
  template: string;
  data: Record<string, unknown>;
}

export interface NotificationPort {
  send(notification: NotificationPayload): Promise<void>;
}
