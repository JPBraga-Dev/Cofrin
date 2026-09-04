import { profileRepository } from "../repositories/security.js";
import { AppError } from "../utils/appError.js";

export const RESERVED_USERNAMES = new Set([
  "admin", "administrator", "root", "api", "auth", "login", "logout", "register", "signup",
  "profile", "profiles", "user", "users", "me", "settings", "social", "support", "system", "cofrin",
]);
export const normalizeEmail = (email: string) => email.trim().toLocaleLowerCase("en-US");
export const normalizeUsername = (value: string) => value.trim().toLocaleLowerCase("en-US").replace(/^@+/, "");

export function validateUsernameSyntax(value: string) {
  const username = normalizeUsername(value);
  if (!/^[a-z0-9_.]{3,30}$/.test(username))
    throw new AppError(422, "USERNAME_INVALID", "Use de 3 a 30 caracteres: letras, números, ponto ou sublinhado.");
  if (RESERVED_USERNAMES.has(username))
    throw new AppError(422, "USERNAME_RESERVED", "Esse @ não está disponível.");
  return username;
}

export async function requireAvailableUsername(value: string, excludeUserId?: string) {
  const username = validateUsernameSyntax(value);
  const existing = await profileRepository.findByUsername(username);
  if (existing && existing.userId !== excludeUserId)
    throw new AppError(409, "USERNAME_TAKEN", "Esse @ já está em uso.");
  return username;
}
