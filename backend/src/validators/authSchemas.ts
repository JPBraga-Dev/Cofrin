import { z } from "zod";

const email = z.string({ invalid_type_error: "E-mail inválido." }).trim().max(254).email("E-mail inválido.");
const password = z.string({ invalid_type_error: "Senha inválida." }).min(10, "Use pelo menos 10 caracteres.").max(128, "Use no máximo 128 caracteres.");
const weakPasswords = new Set(["1234567890", "password123", "qwerty12345"]);
const newPassword = password.refine((value) => !weakPasswords.has(value.toLocaleLowerCase("en-US")), "Escolha uma senha menos comum.");

export const registerSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
  username: z.string().min(1).max(31),
  email,
  password: newPassword,
});
export const loginSchema = z.object({ email, password: z.string().max(128) });
export const profileUpdateSchema = z.object({
  displayName: z.string().trim().min(1).max(80).optional(),
  username: z.string().min(1).max(31).optional(),
  bio: z.string().max(160).optional(),
});
export const usernameCheckSchema = z.object({ username: z.string().min(1).max(31) });
export const passwordChangeSchema = z.object({ currentPassword: z.string().max(128), newPassword });
export const forgotPasswordSchema = z.object({ email });
export const resetPasswordSchema = z.object({ token: z.string().min(40).max(200), newPassword });
export const sessionIdSchema = z.object({ id: z.string().uuid() });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
