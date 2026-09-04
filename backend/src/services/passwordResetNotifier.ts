import { AppError } from "../utils/appError.js";

export interface PasswordResetNotification {
  email: string;
  resetUrl: string;
  requestedAt: string;
}

export interface PasswordResetNotifier {
  send(notification: PasswordResetNotification): Promise<void>;
}

/** Inspectable development outbox; never used in production. */
export const developmentPasswordResetOutbox: PasswordResetNotification[] = [];

class DevelopmentPasswordResetNotifier implements PasswordResetNotifier {
  async send(notification: PasswordResetNotification) {
    developmentPasswordResetOutbox.push(notification);
    if (process.env.NODE_ENV === "development")
      console.info(JSON.stringify({ event: "password-reset-ready", resetUrl: notification.resetUrl }));
  }
}

class WebhookPasswordResetNotifier implements PasswordResetNotifier {
  constructor(private readonly endpoint: string) {}
  async send(notification: PasswordResetNotification) {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(notification),
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new AppError(502, "PASSWORD_RESET_DELIVERY_FAILED", "Não foi possível enviar as instruções agora.");
  }
}

export function passwordResetNotifier(): PasswordResetNotifier {
  if (process.env.NODE_ENV !== "production") return new DevelopmentPasswordResetNotifier();
  const endpoint = process.env.PASSWORD_RESET_WEBHOOK_URL;
  if (!endpoint) throw new AppError(503, "PASSWORD_RESET_NOTIFIER_MISSING", "O envio de recuperação de senha não está configurado.");
  return new WebhookPasswordResetNotifier(endpoint);
}
