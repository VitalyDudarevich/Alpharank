const AVATAR_BUCKET = "avatars";
const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export function avatarObjectPath(userId: string, mime: string) {
  const ext = EXT_BY_MIME[mime] ?? "jpg";
  return `${userId}/avatar.${ext}`;
}

export function validateAvatarFile(file: File) {
  if (!ALLOWED.has(file.type)) {
    return "Допустимы JPEG, PNG, WebP или GIF";
  }
  if (file.size > MAX_BYTES) {
    return "Файл не больше 2 МБ";
  }
  return null;
}

export { AVATAR_BUCKET, MAX_BYTES };
