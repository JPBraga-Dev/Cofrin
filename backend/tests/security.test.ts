import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import request from "supertest";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import { mockDatabase } from "../src/data/mockDatabase.js";
import { SEED_USER_IDS } from "../src/data/seedIds.js";
import { resetRateLimitsForTests } from "../src/middlewares/security.js";
import { resetAuthRateLimitsForTests } from "../src/services/authService.js";
import { hashPassword, passwordNeedsRehash, verifyPassword } from "../src/services/passwordService.js";
import { redactSensitiveFields } from "../src/utils/redaction.js";
import { avatarStorageRoot, coverStorageRoot } from "../src/services/avatarStorage.js";

type DatabaseSnapshot = Pick<typeof mockDatabase, "users" | "profiles" | "sessions" | "passwordResetTokens" | "auditLogs" | "accounts">;
let snapshot: DatabaseSnapshot;
const restore = <T>(target: T[], source: T[]) => target.splice(0, target.length, ...structuredClone(source));

beforeEach(() => {
  snapshot = structuredClone({ users: mockDatabase.users, profiles: mockDatabase.profiles, sessions: mockDatabase.sessions, passwordResetTokens: mockDatabase.passwordResetTokens, auditLogs: mockDatabase.auditLogs, accounts: mockDatabase.accounts });
  resetRateLimitsForTests();
  resetAuthRateLimitsForTests();
});
afterEach(() => {
  restore(mockDatabase.users, snapshot.users); restore(mockDatabase.profiles, snapshot.profiles);
  restore(mockDatabase.sessions, snapshot.sessions); restore(mockDatabase.passwordResetTokens, snapshot.passwordResetTokens);
  restore(mockDatabase.auditLogs, snapshot.auditLogs); restore(mockDatabase.accounts, snapshot.accounts);
});

const registration = (suffix: string) => ({ displayName: `Pessoa ${suffix}`, username: `pessoa.${suffix}`, email: `pessoa.${suffix}@example.com`, password: "uma frase senha segura" });

describe("password and registration security", () => {
  it("uses Argon2id with a unique salt and never stores plaintext", async () => {
    const password = "uma senha longa e segura";
    const [first, second] = await Promise.all([hashPassword(password), hashPassword(password)]);
    expect(first).toMatch(/^\$argon2id\$/); expect(first).not.toBe(second);
    expect(await verifyPassword(first, password)).toBe(true); expect(await verifyPassword(second, password)).toBe(true);
    expect(passwordNeedsRehash(first)).toBe(false);
    const response = await request(app).post("/api/auth/register").send(registration("hash"));
    expect(response.status).toBe(201);
    expect(JSON.stringify(mockDatabase.users)).not.toContain(registration("hash").password);
  });

  it("enforces unique normalized email and username, including concurrent registration", async () => {
    const sameEmailA = registration("racea"); const sameEmailB = { ...registration("raceb"), email: sameEmailA.email.toUpperCase() };
    const responses = await Promise.all([request(app).post("/api/auth/register").send(sameEmailA), request(app).post("/api/auth/register").send(sameEmailB)]);
    expect(responses.map((item) => item.status).sort()).toEqual([201, 409]);
    resetRateLimitsForTests();
    const createdUsername = responses.find((item) => item.status === 201)!.body.data.username as string;
    const usernameTaken = await request(app).post("/api/auth/register").send({ ...registration("other"), username: createdUsername.toUpperCase() });
    expect(usernameTaken.status).toBe(409); expect(usernameTaken.body.error.code).toBe("USERNAME_TAKEN");

    resetRateLimitsForTests();
    const sameUsernameA = registration("atomic"); const sameUsernameB = { ...registration("atomic2"), username: sameUsernameA.username };
    const usernameRace = await Promise.all([request(app).post("/api/auth/register").send(sameUsernameA), request(app).post("/api/auth/register").send(sameUsernameB)]);
    expect(usernameRace.map((item) => item.status).sort()).toEqual([201, 409]);
    expect(mockDatabase.users.filter((item) => [sameUsernameA.email, sameUsernameB.email].includes(item.emailNormalized))).toHaveLength(1);
    expect(mockDatabase.profiles.filter((item) => item.username === sameUsernameA.username)).toHaveLength(1);
    const samePasswordUsers = mockDatabase.users.filter((item) => item.emailNormalized.startsWith("pessoa."));
    expect(samePasswordUsers).toHaveLength(2); expect(new Set(samePasswordUsers.map((item) => item.passwordHash)).size).toBe(2);
  });

  it("redacts credential, cookie, and reset secrets recursively", () => {
    const redacted = redactSensitiveFields({ email: "person@example.com", password: "secret", nested: { cookie: "token", resetToken: "reset" } });
    expect(redacted).toEqual({ email: "person@example.com", password: "[REDACTED]", nested: { cookie: "[REDACTED]", resetToken: "[REDACTED]" } });
  });
});

describe("login and session security", () => {
  it("sets defensive headers, allows credentialed trusted origins, and blocks forged origins and large JSON", async () => {
    const health = await request(app).get("/api/health");
    expect(health.headers["content-security-policy"]).toContain("default-src 'none'");
    expect(health.headers["x-content-type-options"]).toBe("nosniff");
    expect(health.headers["permissions-policy"]).toContain("camera=()");

    const allowed = await request(app).post("/api/auth/login").set("Origin", "http://localhost:5173").send({ email: "missing@example.com", password: "wrong-password" });
    expect(allowed.status).toBe(401); expect(allowed.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    expect(allowed.headers["access-control-allow-credentials"]).toBe("true");

    const forged = await request(app).post("/api/auth/login").set("Origin", "https://evil.example").send({ email: "joao@cofrin.app", password: "CofrinDemo2026!" });
    expect(forged.status).toBe(403); expect(forged.body.error.code).toBe("ORIGIN_FORBIDDEN");

    const tooLarge = await request(app).post("/api/auth/register").set("Content-Type", "application/json").send({ padding: "x".repeat(33 * 1024) });
    expect(tooLarge.status).toBe(413); expect(tooLarge.body.error.code).toBe("PAYLOAD_TOO_LARGE");
  });

  it("creates a hashed, revocable HttpOnly session and exposes only a safe identity", async () => {
    expect(passwordNeedsRehash(mockDatabase.users[0].passwordHash)).toBe(true);
    const agent = request.agent(app); const login = await agent.post("/api/auth/login").send({ email: " joao@COFRIN.app ", password: "CofrinDemo2026!" });
    expect(login.status).toBe(200);
    const cookies = login.headers["set-cookie"] as unknown as string[];
    expect(cookies[0]).toContain("cofrin_session="); expect(cookies[0]).toContain("HttpOnly"); expect(cookies[0]).toContain("SameSite=Lax");
    const rawToken = cookies[0].split(";")[0].split("=")[1];
    expect(mockDatabase.sessions).toHaveLength(1); expect(mockDatabase.sessions[0].tokenHash).not.toBe(rawToken); expect(mockDatabase.sessions[0].tokenHash).toMatch(/^[a-f0-9]{64}$/);
    const me = await agent.get("/api/auth/me");
    expect(me.status).toBe(200); expect(me.body.data.email).toBe("joao@cofrin.app");
    expect(passwordNeedsRehash(mockDatabase.users[0].passwordHash)).toBe(false);
    expect(JSON.stringify(me.body)).not.toMatch(/passwordHash|tokenHash|resetTokenHash/);
    const ownProfile = await agent.get("/api/profile/me");
    expect(ownProfile.status).toBe(200); expect(JSON.stringify(ownProfile.body)).not.toMatch(/passwordHash|tokenHash|resetTokenHash/);
    const publicProfile = await agent.get("/api/users/maria");
    expect(publicProfile.status).toBe(200); expect(publicProfile.body.data).not.toHaveProperty("email");
    const ownUsername = await agent.get("/api/profiles/username-availability?username=joaobraga");
    expect(ownUsername.status).toBe(200); expect(ownUsername.body.data.available).toBe(true);
  });

  it("returns the same message for unknown email and wrong password and rejects operator injection", async () => {
    const missing = await request(app).post("/api/auth/login").send({ email: "missing@example.com", password: "wrong-password" });
    const wrong = await request(app).post("/api/auth/login").send({ email: "joao@cofrin.app", password: "wrong-password" });
    expect(missing.status).toBe(401); expect(wrong.status).toBe(401);
    expect(missing.body.error.message).toBe("E-mail ou senha incorretos."); expect(wrong.body.error.message).toBe(missing.body.error.message);
    const injection = await request(app).post("/api/auth/login").send({ email: { $ne: null }, password: "wrong-password" });
    expect(injection.status).toBe(400);
    mockDatabase.users[0].status = "DISABLED";
    const disabled = await request(app).post("/api/auth/login").send({ email: "joao@cofrin.app", password: "CofrinDemo2026!" });
    expect(disabled.status).toBe(401); expect(disabled.body.error.message).toBe(missing.body.error.message);
    expect(mockDatabase.sessions).toHaveLength(0);
  });

  it("revokes logout tokens and rejects expired sessions and requests without a cookie", async () => {
    const agent = request.agent(app); const login = await agent.post("/api/auth/login").send({ email: "joao@cofrin.app", password: "CofrinDemo2026!" });
    const cookie = ((login.headers["set-cookie"] as unknown as string[])[0]).split(";")[0];
    expect((await request(app).get("/api/accounts")).status).toBe(401);
    mockDatabase.sessions[0].expiresAt = new Date(Date.now() - 1_000).toISOString();
    expect((await request(app).get("/api/auth/me").set("Cookie", cookie)).status).toBe(401);
    mockDatabase.sessions[0].expiresAt = new Date(Date.now() + 60_000).toISOString();
    expect((await request(app).post("/api/auth/logout").set("Cookie", cookie)).status).toBe(204);
    expect((await request(app).get("/api/auth/me").set("Cookie", cookie)).status).toBe(401);
  });

  it("lists safe session metadata and revokes every other active session", async () => {
    const first = request.agent(app); const second = request.agent(app);
    await first.post("/api/auth/login").send({ email: "joao@cofrin.app", password: "CofrinDemo2026!" });
    resetRateLimitsForTests(); resetAuthRateLimitsForTests();
    await second.post("/api/auth/login").send({ email: "joao@cofrin.app", password: "CofrinDemo2026!" });
    const sessions = await first.get("/api/auth/sessions");
    expect(sessions.status).toBe(200); expect(sessions.body.data).toHaveLength(2);
    expect(JSON.stringify(sessions.body)).not.toContain("tokenHash");
    expect((await first.delete("/api/auth/sessions/others")).status).toBe(204);
    expect((await first.get("/api/auth/me")).status).toBe(200);
    expect((await second.get("/api/auth/me")).status).toBe(401);
  });

  it("rate limits repeated login attempts", async () => {
    const statuses: number[] = [];
    for (let index = 0; index < 6; index += 1) statuses.push((await request(app).post("/api/auth/login").send({ email: "attack@example.com", password: "wrong-password" })).status);
    expect(statuses.at(-1)).toBe(429);
  }, 15_000);
});

describe("authorization, profile, and password reset", () => {
  it("blocks account, transaction, piggy, group, conversation, and profile IDOR and strips mass assignment", async () => {
    const agent = request.agent(app); await agent.post("/api/auth/login").send({ email: "joao@cofrin.app", password: "CofrinDemo2026!" });
    mockDatabase.accounts.push({ id: "other-account", userId: SEED_USER_IDS.maria, name: "Privada", type: "CHECKING", initialBalance: 10, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    expect((await agent.get("/api/accounts/other-account")).status).toBe(404);
    const patch = await agent.patch("/api/profile/me").send({ displayName: "Nome seguro", role: "ADMIN", userId: SEED_USER_IDS.maria, emailVerifiedAt: new Date().toISOString() });
    expect(patch.status).toBe(200); expect(patch.body.data.displayName).toBe("Nome seguro"); expect(patch.body.data).not.toHaveProperty("role");
    expect(mockDatabase.users[0]).not.toHaveProperty("role");
    const outsider = request.agent(app); await outsider.post("/api/auth/register").send(registration("outsider"));
    expect((await outsider.get("/api/transactions/t1")).status).toBe(404);
    expect((await outsider.get("/api/piggy-banks/p1")).status).toBe(404);
    expect((await outsider.put("/api/transactions/t1").send({ description: "Tentativa IDOR" })).status).toBe(404);
    expect((await outsider.put("/api/piggy-banks/p1").send({ name: "Tentativa IDOR" })).status).toBe(404);
    expect((await outsider.post("/api/piggy-banks/p1/deposits").send({ accountId: "main", amount: 1 })).status).toBe(404);
    expect((await outsider.get("/api/groups/g1")).status).toBe(404);
    expect((await outsider.post("/api/groups/g1/contributions").send({ sourceAccountId: "main", amount: 1 })).status).toBe(404);
    expect((await outsider.get("/api/conversations/c-direct-lucas/messages")).status).toBe(404);
  });

  it("keeps user HTML as inert text and never enables raw HTML rendering", async () => {
    const agent = request.agent(app); await agent.post("/api/auth/login").send({ email: "joao@cofrin.app", password: "CofrinDemo2026!" });
    const bio = "<script>alert(1)</script>";
    const response = await agent.patch("/api/profile/me").send({ bio });
    expect(response.status).toBe(200); expect(response.body.data.bio).toBe(bio);
    const source = await readFile(resolve(process.cwd(), "../frontend/src/pages/SocialPages.tsx"), "utf8");
    expect(source).not.toContain("dangerouslySetInnerHTML");
  });

  it("requires reauthentication, rotates current session, and revokes the old one after password change", async () => {
    const agent = request.agent(app); const login = await agent.post("/api/auth/login").send({ email: "joao@cofrin.app", password: "CofrinDemo2026!" });
    const oldCookie = ((login.headers["set-cookie"] as unknown as string[])[0]).split(";")[0];
    expect((await agent.post("/api/auth/change-password").send({ currentPassword: "wrong-password", newPassword: "nova senha muito segura" })).status).toBe(401);
    const changed = await agent.post("/api/auth/change-password").send({ currentPassword: "CofrinDemo2026!", newPassword: "nova senha muito segura" });
    expect(changed.status).toBe(204); expect((await request(app).get("/api/auth/me").set("Cookie", oldCookie)).status).toBe(401);
    resetRateLimitsForTests(); resetAuthRateLimitsForTests();
    expect((await request(app).post("/api/auth/login").send({ email: "joao@cofrin.app", password: "nova senha muito segura" })).status).toBe(200);
  });

  it("uses one-time expiring reset tokens and revokes all sessions", async () => {
    const agent = request.agent(app); await agent.post("/api/auth/login").send({ email: "joao@cofrin.app", password: "CofrinDemo2026!" });
    const forgot = await request(app).post("/api/auth/forgot-password").send({ email: "joao@cofrin.app" });
    const token = forgot.body.data.developmentResetToken as string;
    expect(token).toBeTruthy(); expect(JSON.stringify(mockDatabase.passwordResetTokens)).not.toContain(token);
    expect((await request(app).post("/api/auth/reset-password").send({ token, newPassword: "senha redefinida segura" })).status).toBe(204);
    expect((await request(app).post("/api/auth/reset-password").send({ token, newPassword: "outra senha redefinida" })).status).toBe(400);
    resetRateLimitsForTests();
    const expired = await request(app).post("/api/auth/forgot-password").send({ email: "joao@cofrin.app" });
    const expiredToken = expired.body.data.developmentResetToken as string;
    mockDatabase.passwordResetTokens.find((item) => !item.usedAt)!.expiresAt = new Date(Date.now() - 1_000).toISOString();
    expect((await request(app).post("/api/auth/reset-password").send({ token: expiredToken, newPassword: "senha expirada segura" })).status).toBe(400);
  });
});

describe("avatar security", () => {
  it("updates identity, avatar, and cover through one profile bundle", async () => {
    const agent = request.agent(app); const registered = await agent.post("/api/auth/register").send(registration("bundle"));
    const userId = registered.body.data.id as string;
    const avatar = await sharp({ create: { width: 300, height: 300, channels: 3, background: "#4ade80" } }).png().toBuffer();
    const cover = await sharp({ create: { width: 1600, height: 500, channels: 3, background: "#183522" } }).jpeg().toBuffer();
    const response = await agent.patch("/api/profile/me/bundle")
      .field("profile", JSON.stringify({ displayName: "Pessoa Atualizada", username: "pessoa.atualizada", bio: "Perfil salvo de forma atômica." }))
      .field("avatarAction", "REPLACE").field("coverAction", "REPLACE")
      .field("avatarCrop", JSON.stringify({ zoom: 1, positionX: 50, positionY: 50 }))
      .field("coverCrop", JSON.stringify({ zoom: 1, positionX: 50, positionY: 50 }))
      .attach("avatar", avatar, { filename: "avatar.png", contentType: "image/png" })
      .attach("cover", cover, { filename: "cover.jpg", contentType: "image/jpeg" });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ id: userId, displayName: "Pessoa Atualizada", username: "pessoa.atualizada", bio: "Perfil salvo de forma atômica." });
    expect(response.body.data.avatarUrl).toContain(`${userId}/1.webp?v=1`);
    expect(response.body.data.coverUrl).toContain(`${userId}/1.webp?v=1`);
    expect(mockDatabase.profiles.find((item) => item.userId === userId)).toMatchObject({ displayName: "Pessoa Atualizada", username: "pessoa.atualizada", avatarVersion: 1, coverVersion: 1 });
  });

  it("decodes, resizes, re-encodes, owns, versions, synchronizes, and removes a valid image", async () => {
    const agent = request.agent(app); const registered = await agent.post("/api/auth/register").send(registration("avatar"));
    const avatarUserId = registered.body.data.id as string;
    const sourceImage = await sharp({ create: { width: 40, height: 60, channels: 3, background: "#4ade80" } }).withMetadata({ exif: { IFD0: { Artist: "Sensitive camera" } } }).jpeg().toBuffer();
    expect((await sharp(sourceImage).metadata()).exif).toBeDefined();
    const response = await agent.post("/api/profile/avatar").field("userId", SEED_USER_IDS.maria).attach("avatar", sourceImage, { filename: "avatar.jpg", contentType: "image/jpeg" });
    expect(response.status).toBe(200); expect(response.body.data.id).toBe(avatarUserId); expect(response.body.data.avatarUrl).toContain(`${avatarUserId}/1.webp?v=1`);
    const profile = mockDatabase.profiles.find((item) => item.userId === avatarUserId)!;
    expect(profile.avatarPath).toBe(`${avatarUserId}/1.webp`); expect(profile.avatarVersion).toBe(1);
    const storedMetadata = await sharp(await readFile(resolve(avatarStorageRoot, profile.avatarPath))).metadata();
    expect(storedMetadata).toMatchObject({ format: "webp", width: 512, height: 512 }); expect(storedMetadata.exif).toBeUndefined();
    const publicView = await agent.get("/api/users/pessoa.avatar"); expect(publicView.body.data.avatarUrl).toBe(response.body.data.avatarUrl);
    const removed = await agent.delete("/api/profile/avatar"); expect(removed.status).toBe(200); expect(removed.body.data.avatarUrl).toBeUndefined();
  });

  it("rejects executable bytes, SVG, and oversized uploads", async () => {
    const agent = request.agent(app); await agent.post("/api/auth/login").send({ email: "joao@cofrin.app", password: "CofrinDemo2026!" });
    expect((await agent.post("/api/profile/avatar").attach("avatar", Buffer.from("MZ executable"), { filename: "evil.jpg", contentType: "image/jpeg" })).status).toBe(415);
    resetRateLimitsForTests();
    expect((await agent.post("/api/profile/avatar").attach("avatar", Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'></svg>"), { filename: "avatar.svg", contentType: "image/svg+xml" })).status).toBe(415);
    resetRateLimitsForTests();
    expect((await agent.post("/api/profile/avatar").attach("avatar", Buffer.alloc(5 * 1024 * 1024 + 1), { filename: "huge.png", contentType: "image/png" })).status).toBe(413);
  });

  it("rejects an image with dimensions above the decoding policy", async () => {
    const agent = request.agent(app); await agent.post("/api/auth/login").send({ email: "joao@cofrin.app", password: "CofrinDemo2026!" });
    const tooWide = await sharp({ create: { width: 8_001, height: 1, channels: 3, background: "#4ade80" } }).png().toBuffer();
    const response = await agent.post("/api/profile/avatar").attach("avatar", tooWide, { filename: "too-wide.png", contentType: "image/png" });
    expect(response.status).toBe(413); expect(response.body.error.code).toBe("AVATAR_TOO_LARGE");
  });
});

describe("cover security", () => {
  it("re-encodes, crops, versions, exposes publicly, owns, and removes a cover", async () => {
    const agent = request.agent(app); const registered = await agent.post("/api/auth/register").send(registration("cover"));
    const coverUserId = registered.body.data.id as string;
    const sourceImage = await sharp({ create: { width: 2200, height: 900, channels: 3, background: "#183522" } }).withMetadata({ exif: { IFD0: { Artist: "Private author" } } }).jpeg().toBuffer();
    const response = await agent.post("/api/profile/cover").field("userId", SEED_USER_IDS.maria).field("zoom", "1.2").field("positionX", "70").field("positionY", "30").attach("cover", sourceImage, { filename: "cover.jpg", contentType: "image/jpeg" });
    expect(response.status).toBe(200); expect(response.body.data.id).toBe(coverUserId); expect(response.body.data.coverUrl).toContain(`${coverUserId}/1.webp?v=1`);
    const profile = mockDatabase.profiles.find((item) => item.userId === coverUserId)!;
    expect(profile.coverPath).toBe(`${coverUserId}/1.webp`); expect(profile.coverVersion).toBe(1);
    const storedMetadata = await sharp(await readFile(resolve(coverStorageRoot, profile.coverPath))).metadata();
    expect(storedMetadata).toMatchObject({ format: "webp", width: 1600, height: 500 }); expect(storedMetadata.exif).toBeUndefined();
    const publicView = await agent.get("/api/users/pessoa.cover"); expect(publicView.body.data.coverUrl).toBe(response.body.data.coverUrl); expect(publicView.body.data.email).toBeUndefined();
    const removed = await agent.delete("/api/profile/cover"); expect(removed.status).toBe(200); expect(removed.body.data.coverUrl).toBeUndefined();
  });

  it("rejects SVG, disguised bytes, oversized files, and extreme dimensions", async () => {
    const agent = request.agent(app); await agent.post("/api/auth/login").send({ email: "joao@cofrin.app", password: "CofrinDemo2026!" });
    expect((await agent.post("/api/profile/cover").attach("cover", Buffer.from("MZ executable"), { filename: "cover.jpg", contentType: "image/jpeg" })).status).toBe(415);
    resetRateLimitsForTests();
    expect((await agent.post("/api/profile/cover").attach("cover", Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'></svg>"), { filename: "cover.svg", contentType: "image/svg+xml" })).status).toBe(415);
    resetRateLimitsForTests();
    expect((await agent.post("/api/profile/cover").attach("cover", Buffer.alloc(8 * 1024 * 1024 + 1), { filename: "huge.png", contentType: "image/png" })).status).toBe(413);
    resetRateLimitsForTests();
    const tooWide = await sharp({ create: { width: 8_001, height: 1, channels: 3, background: "#183522" } }).png().toBuffer();
    const dimensions = await agent.post("/api/profile/cover").attach("cover", tooWide, { filename: "too-wide.png", contentType: "image/png" });
    expect(dimensions.status).toBe(413); expect(dimensions.body.error.code).toBe("COVER_TOO_LARGE");
  });
});
