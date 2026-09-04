import { mkdir, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export interface ProfileImageStorage {
  saveAvatar(userId: string, version: number, contents: Buffer): Promise<string>;
  deleteAvatar(path?: string): Promise<void>;
  saveCover(userId: string, version: number, contents: Buffer): Promise<string>;
  deleteCover(path?: string): Promise<void>;
}

export const avatarStorageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../storage/avatars");
export const coverStorageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../storage/covers");

async function save(root: string, userId: string, version: number, contents: Buffer) {
    const directory = resolve(root, userId);
    await mkdir(directory, { recursive: true });
    const filename = `${version}.webp`;
    await writeFile(resolve(directory, filename), contents, { flag: "wx" });
    return `${userId}/${filename}`;
}
async function remove(root: string, path?: string) {
    if (!path || !/^[0-9a-f-]{36}\/\d+\.webp$/i.test(path)) return;
    const target = resolve(root, path);
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try { await unlink(target); return; }
      catch (cause) {
        const code = cause && typeof cause === "object" && "code" in cause ? cause.code : undefined;
        if (code === "ENOENT") return;
        if (!["EBUSY", "EPERM"].includes(String(code)) || attempt === 3) throw cause;
        await new Promise((done) => setTimeout(done, 25 * (attempt + 1)));
      }
    }
}

export const localProfileImageStorage: ProfileImageStorage = {
  saveAvatar: (userId, version, contents) => save(avatarStorageRoot, userId, version, contents),
  deleteAvatar: (path) => remove(avatarStorageRoot, path),
  saveCover: (userId, version, contents) => save(coverStorageRoot, userId, version, contents),
  deleteCover: (path) => remove(coverStorageRoot, path),
};

// Compatibilidade com os consumidores existentes; novos fluxos usam o adapter acima.
export const localAvatarStorage = {
  save: localProfileImageStorage.saveAvatar,
  remove: localProfileImageStorage.deleteAvatar,
};
