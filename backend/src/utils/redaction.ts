const SENSITIVE_KEY = /^(authorization|cookie|cofrin_session|password|plainPassword|confirmPassword|currentPassword|newPassword|passwordHash|sessionToken|sessionTokenHash|tokenHash|resetToken|resetTokenHash)$/i;

export function redactSensitiveFields(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSensitiveFields);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      key,
      SENSITIVE_KEY.test(key) ? "[REDACTED]" : redactSensitiveFields(entry),
    ]),
  );
}
