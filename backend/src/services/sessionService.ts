import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { Session } from "../domain/types.js";
import { sessionRepository, userRepository } from "../repositories/security.js";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SESSION_INACTIVITY_TTL_MS = 24 * 60 * 60 * 1000;
const LAST_SEEN_THROTTLE_MS = 5 * 60 * 1000;
export const SESSION_COOKIE = "cofrin_session";
export const sessionTokenHash = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createSession(userId: string, metadata: { ip?: string; userAgent?: string } = {}) {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const session: Session = {
    id: randomUUID(), userId, tokenHash: sessionTokenHash(token), createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + SESSION_TTL_MS).toISOString(), lastSeenAt: now.toISOString(),
    createdIpMetadata: metadata.ip, userAgentMetadata: metadata.userAgent?.slice(0, 180),
  };
  await sessionRepository.create(session);
  return { token, session };
}

export async function authenticateSession(token?: string) {
  if (!token || token.length > 200) return null;
  const session = await sessionRepository.findByTokenHash(sessionTokenHash(token));
  if (!session || session.revokedAt || Date.parse(session.expiresAt) <= Date.now() || Date.now() - Date.parse(session.lastSeenAt) > SESSION_INACTIVITY_TTL_MS) return null;
  const user = await userRepository.findById(session.userId);
  if (!user || user.status !== "ACTIVE") return null;
  if (Date.now() - Date.parse(session.lastSeenAt) >= LAST_SEEN_THROTTLE_MS)
    await sessionRepository.update(session.id, { lastSeenAt: new Date().toISOString() });
  return { session, user };
}

export const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_TTL_MS,
});
