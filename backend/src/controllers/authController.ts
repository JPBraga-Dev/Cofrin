import type { Request, Response } from "express";
import { sessionRepository } from "../repositories/security.js";
import { changePassword, forgotPassword, login, logout, register, resetPassword, safeIdentity } from "../services/authService.js";
import { audit, pseudonymize } from "../services/auditService.js";
import { cookieOptions, SESSION_COOKIE } from "../services/sessionService.js";
import { forgotPasswordSchema, loginSchema, passwordChangeSchema, registerSchema, resetPasswordSchema } from "../validators/authSchemas.js";

const metadata = (req: Request) => ({ ip: pseudonymize(req.ip || req.socket.remoteAddress || "unknown"), userAgent: req.get("user-agent") });
const setSessionCookie = (res: Response, token: string) => res.cookie(SESSION_COOKIE, token, cookieOptions());

export async function registerAccount(req: Request, res: Response) {
  const result = await register(registerSchema.parse(req.body), metadata(req));
  setSessionCookie(res, result.token);
  res.status(201).json({ data: result.identity });
}
export async function loginAccount(req: Request, res: Response) {
  const result = await login(loginSchema.parse(req.body), metadata(req));
  setSessionCookie(res, result.token);
  res.json({ data: result.identity });
}
export async function me(req: Request, res: Response) { res.json({ data: await safeIdentity(req.auth!.user.id, true) }); }
export async function logoutAccount(req: Request, res: Response) {
  await logout(req.auth!.session.id, req.auth!.user.id);
  res.clearCookie(SESSION_COOKIE, { ...cookieOptions(), maxAge: undefined });
  res.status(204).send();
}
export async function changeAccountPassword(req: Request, res: Response) {
  const value = passwordChangeSchema.parse(req.body);
  const result = await changePassword(req.auth!.user.id, req.auth!.session.id, value.currentPassword, value.newPassword, metadata(req));
  setSessionCookie(res, result.token);
  res.status(204).send();
}
export async function requestPasswordReset(req: Request, res: Response) {
  const { email } = forgotPasswordSchema.parse(req.body);
  const token = await forgotPassword(email);
  res.json({ data: { message: "Se existir uma conta com esse e-mail, enviaremos instruções.", ...(process.env.NODE_ENV === "test" && token ? { developmentResetToken: token } : {}) } });
}
export async function completePasswordReset(req: Request, res: Response) {
  const value = resetPasswordSchema.parse(req.body);
  await resetPassword(value.token, value.newPassword);
  res.status(204).send();
}
export async function listSessions(req: Request, res: Response) {
  const sessions = await sessionRepository.listByUserId(req.auth!.user.id);
  res.json({ data: sessions.filter((session) => !session.revokedAt && Date.parse(session.expiresAt) > Date.now()).map((session) => ({ id: session.id, createdAt: session.createdAt, expiresAt: session.expiresAt, lastSeenAt: session.lastSeenAt, userAgent: session.userAgentMetadata, current: session.id === req.auth!.session.id })) });
}
export async function revokeOtherSessions(req: Request, res: Response) {
  await sessionRepository.revokeAllByUserId(req.auth!.user.id, req.auth!.session.id);
  audit("SESSION_REVOKED", req.auth!.user.id, { exceptCurrent: true });
  res.status(204).send();
}
