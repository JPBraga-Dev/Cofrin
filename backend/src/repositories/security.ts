import { mockDatabase } from "../data/mockDatabase.js";
import type { PasswordResetToken, Profile, Session, User } from "../domain/types.js";
import { AppError } from "../utils/appError.js";

export interface UserRepository {
  findById(id: string): Promise<User | undefined>;
  findByNormalizedEmail(email: string): Promise<User | undefined>;
  create(user: User): Promise<User>;
  update(id: string, patch: Partial<User>): Promise<User | undefined>;
  delete(id: string): Promise<boolean>;
}
export interface ProfileRepository {
  findByUserId(userId: string): Promise<Profile | undefined>;
  findByUsername(username: string): Promise<Profile | undefined>;
  create(profile: Profile): Promise<Profile>;
  update(userId: string, patch: Partial<Profile>): Promise<Profile | undefined>;
  delete(userId: string): Promise<boolean>;
}
export interface SessionRepository {
  findByTokenHash(tokenHash: string): Promise<Session | undefined>;
  listByUserId(userId: string): Promise<Session[]>;
  create(session: Session): Promise<Session>;
  update(id: string, patch: Partial<Session>): Promise<Session | undefined>;
  revokeAllByUserId(userId: string, exceptId?: string): Promise<void>;
}
export interface PasswordResetRepository {
  findByTokenHash(tokenHash: string): Promise<PasswordResetToken | undefined>;
  create(token: PasswordResetToken): Promise<PasswordResetToken>;
  update(id: string, patch: Partial<PasswordResetToken>): Promise<PasswordResetToken | undefined>;
}

const removeBy = <T>(items: T[], predicate: (item: T) => boolean) => {
  const index = items.findIndex(predicate);
  if (index < 0) return false;
  items.splice(index, 1);
  return true;
};

export const userRepository: UserRepository = {
  async findById(id) { return mockDatabase.users.find((user) => user.id === id); },
  async findByNormalizedEmail(email) { return mockDatabase.users.find((user) => user.emailNormalized === email); },
  async create(user) {
    if (mockDatabase.users.some((item) => item.emailNormalized === user.emailNormalized))
      throw new AppError(409, "EMAIL_TAKEN", "Já existe uma conta com esse e-mail.");
    mockDatabase.users.push(user);
    return user;
  },
  async update(id, patch) {
    const user = mockDatabase.users.find((item) => item.id === id);
    if (!user) return undefined;
    Object.assign(user, patch);
    return user;
  },
  async delete(id) { return removeBy(mockDatabase.users, (user) => user.id === id); },
};

export const profileRepository: ProfileRepository = {
  async findByUserId(userId) { return mockDatabase.profiles.find((profile) => profile.userId === userId); },
  async findByUsername(username) { return mockDatabase.profiles.find((profile) => profile.username === username); },
  async create(profile) {
    if (mockDatabase.profiles.some((item) => item.userId === profile.userId))
      throw new AppError(409, "PROFILE_EXISTS", "A conta já possui um perfil.");
    if (mockDatabase.profiles.some((item) => item.username === profile.username))
      throw new AppError(409, "USERNAME_TAKEN", "Esse @ já está em uso.");
    mockDatabase.profiles.push(profile);
    return profile;
  },
  async update(userId, patch) {
    const profile = mockDatabase.profiles.find((item) => item.userId === userId);
    if (!profile) return undefined;
    if (patch.username && mockDatabase.profiles.some((item) => item.userId !== userId && item.username === patch.username))
      throw new AppError(409, "USERNAME_TAKEN", "Esse @ já está em uso.");
    Object.assign(profile, patch);
    return profile;
  },
  async delete(userId) { return removeBy(mockDatabase.profiles, (profile) => profile.userId === userId); },
};

export const sessionRepository: SessionRepository = {
  async findByTokenHash(tokenHash) { return mockDatabase.sessions.find((session) => session.tokenHash === tokenHash); },
  async listByUserId(userId) { return mockDatabase.sessions.filter((session) => session.userId === userId); },
  async create(session) { mockDatabase.sessions.push(session); return session; },
  async update(id, patch) {
    const session = mockDatabase.sessions.find((item) => item.id === id);
    if (!session) return undefined;
    Object.assign(session, patch);
    return session;
  },
  async revokeAllByUserId(userId, exceptId) {
    const revokedAt = new Date().toISOString();
    for (const session of mockDatabase.sessions)
      if (session.userId === userId && session.id !== exceptId && !session.revokedAt) session.revokedAt = revokedAt;
  },
};

export const passwordResetRepository: PasswordResetRepository = {
  async findByTokenHash(tokenHash) { return mockDatabase.passwordResetTokens.find((token) => token.tokenHash === tokenHash); },
  async create(token) { mockDatabase.passwordResetTokens.push(token); return token; },
  async update(id, patch) {
    const token = mockDatabase.passwordResetTokens.find((item) => item.id === id);
    if (!token) return undefined;
    Object.assign(token, patch);
    return token;
  },
};
