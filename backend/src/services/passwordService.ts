import argon2 from "argon2";

export const PASSWORD_HASH_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 98_304,
  timeCost: 4,
  parallelism: 1,
  hashLength: 32,
} as const;

export const DUMMY_PASSWORD_HASH = "$argon2id$v=19$m=98304,p=1,t=4$u2v9q6WmyKcGEGtv/54VwQ$ZS3WuyfDcztIQcfI/JLUaALbifAIGOjwl+4DxD9k8BQ";
export const hashPassword = (password: string) => argon2.hash(password, PASSWORD_HASH_OPTIONS);
export const verifyPassword = (hash: string, password: string) => argon2.verify(hash, password);
export const passwordNeedsRehash = (hash: string) => argon2.needsRehash(hash, PASSWORD_HASH_OPTIONS);
