import type { Request, Response } from "express";
import sharp from "sharp";
import { profileRepository } from "../repositories/security.js";
import { audit } from "../services/auditService.js";
import { localProfileImageStorage } from "../services/avatarStorage.js";
import { safeIdentity } from "../services/authService.js";
import { AppError } from "../utils/appError.js";
import { profileUpdateSchema } from "../validators/authSchemas.js";
import { validateUsername } from "../services/socialService.js";

const MAX_PIXELS = 24_000_000;
const MAX_DIMENSION = 8_000;
type ImageKind = "avatar" | "cover";

function numericField(value: unknown, fallback: number, minimum: number, maximum: number) {
  const parsed = typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback;
}

async function processProfileImage(file: Express.Multer.File | undefined, body: Record<string, unknown>, kind: ImageKind) {
  const label = kind === "avatar" ? "foto" : "capa";
  const invalidCode = kind === "avatar" ? "AVATAR_INVALID" : "COVER_INVALID";
  const largeCode = kind === "avatar" ? "AVATAR_TOO_LARGE" : "COVER_TOO_LARGE";
  if (!file) throw new AppError(400, invalidCode, `Selecione uma imagem para a ${label}.`);
  const input = sharp(file.buffer, { failOn: "error", limitInputPixels: MAX_PIXELS });
  const metadata = await input.metadata().catch(() => {
    throw new AppError(415, invalidCode, "O arquivo não é uma imagem válida.");
  });
  if (!metadata.format || !["jpeg", "png", "webp"].includes(metadata.format) || (metadata.pages ?? 1) > 1)
    throw new AppError(415, invalidCode, "Use uma imagem JPEG, PNG ou WebP estática.");
  if (!metadata.width || !metadata.height || metadata.width > MAX_DIMENSION || metadata.height > MAX_DIMENSION || metadata.width * metadata.height > MAX_PIXELS)
    throw new AppError(413, largeCode, "A imagem possui dimensões muito grandes.");

  const rotated = await input.rotate().toBuffer({ resolveWithObject: true }).catch(() => {
    throw new AppError(415, invalidCode, "Não foi possível processar esta imagem.");
  });
  const width = rotated.info.width;
  const height = rotated.info.height;
  const targetWidth = kind === "avatar" ? 512 : 1600;
  const targetHeight = kind === "avatar" ? 512 : 500;
  const targetRatio = targetWidth / targetHeight;
  const zoom = numericField(body.zoom, 1, 1, 3);
  const positionX = numericField(body.positionX, 50, 0, 100) / 100;
  const positionY = numericField(body.positionY, 50, 0, 100) / 100;
  let cropWidth = width;
  let cropHeight = Math.round(cropWidth / targetRatio);
  if (cropHeight > height) {
    cropHeight = height;
    cropWidth = Math.round(cropHeight * targetRatio);
  }
  cropWidth = Math.max(1, Math.round(cropWidth / zoom));
  cropHeight = Math.max(1, Math.round(cropHeight / zoom));
  const left = Math.round((width - cropWidth) * positionX);
  const top = Math.round((height - cropHeight) * positionY);
  return sharp(rotated.data)
    .extract({ left, top, width: cropWidth, height: cropHeight })
    .resize(targetWidth, targetHeight, { fit: "fill" })
    .webp({ quality: kind === "avatar" ? 84 : 82 })
    .toBuffer();
}

export async function uploadAvatar(req: Request, res: Response) {
  const processed = await processProfileImage(req.file, req.body, "avatar");
  const profile = await profileRepository.findByUserId(req.auth!.user.id);
  if (!profile) throw new AppError(404, "PROFILE_NOT_FOUND", "Perfil não encontrado.");
  const nextVersion = profile.avatarVersion + 1;
  const path = await localProfileImageStorage.saveAvatar(profile.userId, nextVersion, processed);
  const oldPath = profile.avatarPath;
  try {
    await profileRepository.update(profile.userId, { avatarPath: path, avatarVersion: nextVersion, updatedAt: new Date().toISOString() });
  } catch (cause) {
    await localProfileImageStorage.deleteAvatar(path);
    throw cause;
  }
  await localProfileImageStorage.deleteAvatar(oldPath);
  audit("AVATAR_UPDATED", profile.userId, { version: nextVersion });
  res.json({ data: await safeIdentity(profile.userId, true) });
}

export async function removeAvatar(req: Request, res: Response) {
  const profile = await profileRepository.findByUserId(req.auth!.user.id);
  if (!profile) throw new AppError(404, "PROFILE_NOT_FOUND", "Perfil não encontrado.");
  await localProfileImageStorage.deleteAvatar(profile.avatarPath);
  await profileRepository.update(profile.userId, { avatarPath: undefined, avatarVersion: profile.avatarVersion + 1, updatedAt: new Date().toISOString() });
  audit("AVATAR_REMOVED", profile.userId);
  res.json({ data: await safeIdentity(profile.userId, true) });
}

export async function uploadCover(req: Request, res: Response) {
  const processed = await processProfileImage(req.file, req.body, "cover");
  const profile = await profileRepository.findByUserId(req.auth!.user.id);
  if (!profile) throw new AppError(404, "PROFILE_NOT_FOUND", "Perfil não encontrado.");
  const nextVersion = profile.coverVersion + 1;
  const path = await localProfileImageStorage.saveCover(profile.userId, nextVersion, processed);
  const oldPath = profile.coverPath;
  try {
    await profileRepository.update(profile.userId, { coverPath: path, coverVersion: nextVersion, updatedAt: new Date().toISOString() });
  } catch (cause) {
    await localProfileImageStorage.deleteCover(path);
    throw cause;
  }
  await localProfileImageStorage.deleteCover(oldPath);
  audit("COVER_UPDATED", profile.userId, { version: nextVersion });
  res.json({ data: await safeIdentity(profile.userId, true) });
}

export async function removeCover(req: Request, res: Response) {
  const profile = await profileRepository.findByUserId(req.auth!.user.id);
  if (!profile) throw new AppError(404, "PROFILE_NOT_FOUND", "Perfil não encontrado.");
  await localProfileImageStorage.deleteCover(profile.coverPath);
  await profileRepository.update(profile.userId, { coverPath: undefined, coverVersion: profile.coverVersion + 1, updatedAt: new Date().toISOString() });
  audit("COVER_REMOVED", profile.userId);
  res.json({ data: await safeIdentity(profile.userId, true) });
}

type MediaAction = "KEEP" | "REMOVE" | "REPLACE";
const mediaAction = (value: unknown): MediaAction =>
  value === "REMOVE" || value === "REPLACE" ? value : "KEEP";

function bundleFiles(req: Request) {
  const files = (req.files ?? {}) as Record<string, Express.Multer.File[]>;
  return { avatar: files.avatar?.[0], cover: files.cover?.[0] };
}

/** Saves identity, avatar and cover as one logical profile operation. */
export async function saveProfileBundle(req: Request, res: Response) {
  const current = await profileRepository.findByUserId(req.auth!.user.id);
  if (!current) throw new AppError(404, "PROFILE_NOT_FOUND", "Perfil não encontrado.");
  const previousUsername = current.username;
  const oldAvatarPath = current.avatarPath;
  const oldCoverPath = current.coverPath;
  let rawProfile: unknown;
  try {
    rawProfile = JSON.parse(typeof req.body.profile === "string" ? req.body.profile : "{}");
  } catch {
    throw new AppError(400, "PROFILE_INVALID", "Os dados do perfil são inválidos.");
  }
  const profileData = profileUpdateSchema.parse(rawProfile);
  const avatarAction = mediaAction(req.body.avatarAction);
  const coverAction = mediaAction(req.body.coverAction);
  const files = bundleFiles(req);
  if (avatarAction === "REPLACE" && !files.avatar) throw new AppError(400, "AVATAR_INVALID", "Selecione uma imagem para a foto.");
  if (coverAction === "REPLACE" && !files.cover) throw new AppError(400, "COVER_INVALID", "Selecione uma imagem para a capa.");
  if (files.avatar && files.avatar.size > 5 * 1024 * 1024) throw new AppError(413, "AVATAR_TOO_LARGE", "A foto deve ter no máximo 5 MB.");

  const avatarCrop = req.body.avatarCrop ? JSON.parse(String(req.body.avatarCrop)) as Record<string, unknown> : {};
  const coverCrop = req.body.coverCrop ? JSON.parse(String(req.body.coverCrop)) as Record<string, unknown> : {};
  const [processedAvatar, processedCover] = await Promise.all([
    avatarAction === "REPLACE" ? processProfileImage(files.avatar, avatarCrop, "avatar") : undefined,
    coverAction === "REPLACE" ? processProfileImage(files.cover, coverCrop, "cover") : undefined,
  ]);
  const nextUsername = profileData.username === undefined ? current.username : await validateUsername(profileData.username, current.userId);
  const nextAvatarVersion = avatarAction === "KEEP" ? current.avatarVersion : current.avatarVersion + 1;
  const nextCoverVersion = coverAction === "KEEP" ? current.coverVersion : current.coverVersion + 1;
  let savedAvatarPath: string | undefined;
  let savedCoverPath: string | undefined;

  try {
    if (processedAvatar) savedAvatarPath = await localProfileImageStorage.saveAvatar(current.userId, nextAvatarVersion, processedAvatar);
    if (processedCover) savedCoverPath = await localProfileImageStorage.saveCover(current.userId, nextCoverVersion, processedCover);
    await profileRepository.update(current.userId, {
      displayName: profileData.displayName ?? current.displayName,
      username: nextUsername,
      bio: profileData.bio === undefined ? current.bio : profileData.bio.trim() || undefined,
      avatarPath: avatarAction === "REPLACE" ? savedAvatarPath : avatarAction === "REMOVE" ? undefined : current.avatarPath,
      avatarVersion: nextAvatarVersion,
      coverPath: coverAction === "REPLACE" ? savedCoverPath : coverAction === "REMOVE" ? undefined : current.coverPath,
      coverVersion: nextCoverVersion,
      updatedAt: new Date().toISOString(),
    });
  } catch (cause) {
    await Promise.all([
      localProfileImageStorage.deleteAvatar(savedAvatarPath),
      localProfileImageStorage.deleteCover(savedCoverPath),
    ]);
    throw cause;
  }

  await Promise.all([
    avatarAction !== "KEEP" ? localProfileImageStorage.deleteAvatar(oldAvatarPath) : undefined,
    coverAction !== "KEEP" ? localProfileImageStorage.deleteCover(oldCoverPath) : undefined,
  ]);
  audit(previousUsername === nextUsername ? "PROFILE_UPDATED" : "USERNAME_CHANGED", current.userId, {
    avatarChanged: avatarAction !== "KEEP",
    coverChanged: coverAction !== "KEEP",
  });
  return res.json({ data: await safeIdentity(current.userId, true) });
}
