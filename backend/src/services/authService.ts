import { randomBytes, randomUUID } from "node:crypto";
import { profileRepository, passwordResetRepository, sessionRepository, userRepository } from "../repositories/security.js";
import { AppError } from "../utils/appError.js";
import type { LoginInput, RegisterInput } from "../validators/authSchemas.js";
import { audit, pseudonymize } from "./auditService.js";
import { normalizeEmail, requireAvailableUsername } from "./identityService.js";
import { DUMMY_PASSWORD_HASH, hashPassword, passwordNeedsRehash, verifyPassword } from "./passwordService.js";
import { createSession, sessionTokenHash } from "./sessionService.js";
import { passwordResetNotifier } from "./passwordResetNotifier.js";

const RESET_TTL_MS = 20 * 60 * 1000;
const loginFailures = new Map<string, { count: number; startedAt: number }>();

export const avatarUrlFor = (path?: string, version = 0) => path
  ? `${process.env.PUBLIC_API_ORIGIN ?? "http://localhost:3001"}/avatars/${path.replaceAll("\\", "/")}?v=${version}`
  : undefined;
export const coverUrlFor = (path?: string, version = 0) => path
  ? `${process.env.PUBLIC_API_ORIGIN ?? "http://localhost:3001"}/covers/${path.replaceAll("\\", "/")}?v=${version}`
  : undefined;

export async function safeIdentity(userId: string, includePrivate = false) {
  const [user, profile] = await Promise.all([userRepository.findById(userId), profileRepository.findByUserId(userId)]);
  if (!user || !profile) throw new AppError(404, "PROFILE_NOT_FOUND", "Perfil não encontrado.");
  return {
    id: user.id, displayName: profile.displayName, username: profile.username, bio: profile.bio,
    avatarUrl: avatarUrlFor(profile.avatarPath, profile.avatarVersion),
    coverUrl: coverUrlFor(profile.coverPath, profile.coverVersion),
    createdAt: user.createdAt, updatedAt: profile.updatedAt,
    ...(includePrivate ? { email: user.emailNormalized } : {}),
  };
}

export async function register(input: RegisterInput, metadata: { ip?: string; userAgent?: string } = {}) {
  const emailNormalized = normalizeEmail(input.email);
  if (await userRepository.findByNormalizedEmail(emailNormalized))
    throw new AppError(409, "EMAIL_TAKEN", "Já existe uma conta com esse e-mail.");
  const username = await requireAvailableUsername(input.username);
  const stamp = new Date().toISOString();
  const userId = randomUUID();
  const user = { id: userId, emailNormalized, passwordHash: await hashPassword(input.password), status: "ACTIVE" as const, createdAt: stamp, updatedAt: stamp, passwordChangedAt: stamp };
  await userRepository.create(user);
  try {
    await profileRepository.create({ userId, displayName: input.displayName, username, avatarVersion: 0, coverVersion: 0, createdAt: stamp, updatedAt: stamp });
    const created = await createSession(userId, metadata);
    audit("REGISTER_SUCCESS", userId);
    return { ...created, identity: await safeIdentity(userId, true) };
  } catch (cause) {
    await profileRepository.delete(userId);
    await userRepository.delete(userId);
    throw cause;
  }
}

export async function login(input: LoginInput, metadata: { ip?: string; userAgent?: string } = {}) {
  const emailNormalized = normalizeEmail(input.email);
  const key = pseudonymize(emailNormalized);
  const attempt = loginFailures.get(key);
  if (attempt && Date.now() - attempt.startedAt < 15 * 60 * 1000 && attempt.count >= 10)
    throw new AppError(429, "AUTH_RATE_LIMITED", "Muitas tentativas. Aguarde alguns minutos.");
  const user = await userRepository.findByNormalizedEmail(emailNormalized);
  const valid = await verifyPassword(user?.passwordHash ?? DUMMY_PASSWORD_HASH, input.password).catch(() => false);
  if (!user || !valid || user.status !== "ACTIVE") {
    const current = attempt && Date.now() - attempt.startedAt < 15 * 60 * 1000 ? attempt : { count: 0, startedAt: Date.now() };
    current.count += 1;
    loginFailures.set(key, current);
    const delay = current.count <= 1 ? 0 : Math.min(2_000, 250 * 2 ** (current.count - 2));
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    audit("LOGIN_FAILED", user?.id, { identifierHash: key });
    throw new AppError(401, "AUTH_INVALID_CREDENTIALS", "E-mail ou senha incorretos.");
  }
  loginFailures.delete(key);
  const now = new Date().toISOString();
  const patch: Record<string, string> = { lastLoginAt: now, updatedAt: now };
  if (passwordNeedsRehash(user.passwordHash)) patch.passwordHash = await hashPassword(input.password);
  await userRepository.update(user.id, patch);
  const created = await createSession(user.id, metadata);
  audit("LOGIN_SUCCESS", user.id);
  return { ...created, identity: await safeIdentity(user.id, true) };
}

export async function logout(sessionId: string, userId: string) {
  await sessionRepository.update(sessionId, { revokedAt: new Date().toISOString() });
  audit("LOGOUT", userId);
}

export async function changePassword(userId: string, sessionId: string, currentPassword: string, newPassword: string, metadata: { ip?: string; userAgent?: string }) {
  const user = await userRepository.findById(userId);
  if (!user || !(await verifyPassword(user.passwordHash, currentPassword)))
    throw new AppError(401, "CURRENT_PASSWORD_INVALID", "A senha atual está incorreta.");
  const stamp = new Date().toISOString();
  await userRepository.update(userId, { passwordHash: await hashPassword(newPassword), passwordChangedAt: stamp, updatedAt: stamp });
  await sessionRepository.revokeAllByUserId(userId);
  const created = await createSession(userId, metadata);
  audit("PASSWORD_CHANGED", userId, { rotatedFrom: sessionId });
  return created;
}

export async function forgotPassword(email: string) {
  const user = await userRepository.findByNormalizedEmail(normalizeEmail(email));
  if (!user) return undefined;
  const token = randomBytes(32).toString("base64url");
  const stamp = new Date().toISOString();
  await passwordResetRepository.create({ id: randomUUID(), userId: user.id, tokenHash: sessionTokenHash(token), createdAt: stamp, expiresAt: new Date(Date.now() + RESET_TTL_MS).toISOString() });
  audit("PASSWORD_RESET_REQUESTED", user.id);
  const publicAppOrigin = process.env.PUBLIC_APP_ORIGIN ?? "http://localhost:5173";
  await passwordResetNotifier().send({ email: user.emailNormalized, resetUrl: `${publicAppOrigin}/reset-password?token=${encodeURIComponent(token)}`, requestedAt: stamp });
  return token;
}

export async function resetPassword(token: string, newPassword: string) {
  const reset = await passwordResetRepository.findByTokenHash(sessionTokenHash(token));
  if (!reset || reset.usedAt || Date.parse(reset.expiresAt) <= Date.now())
    throw new AppError(400, "RESET_TOKEN_INVALID", "Este link é inválido ou expirou.");
  const stamp = new Date().toISOString();
  await userRepository.update(reset.userId, { passwordHash: await hashPassword(newPassword), passwordChangedAt: stamp, updatedAt: stamp });
  await passwordResetRepository.update(reset.id, { usedAt: stamp });
  await sessionRepository.revokeAllByUserId(reset.userId);
  audit("PASSWORD_RESET_COMPLETED", reset.userId);
}

export function resetAuthRateLimitsForTests() { loginFailures.clear(); }
