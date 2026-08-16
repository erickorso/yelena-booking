/** Profile avatar images (public URL for display). */
export const ALLOWED_PROFILE_PHOTO_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type AllowedProfilePhotoType =
  (typeof ALLOWED_PROFILE_PHOTO_TYPES)[number];

export const MAX_PROFILE_PHOTO_BYTES = 2 * 1024 * 1024; // 2 MB

export function isAllowedProfilePhotoType(
  value: string,
): value is AllowedProfilePhotoType {
  return (ALLOWED_PROFILE_PHOTO_TYPES as readonly string[]).includes(value);
}

export function assertValidProfilePhoto(file: {
  type: string;
  size: number;
  name: string;
}): void {
  if (!file.name.trim()) {
    throw new Error("File name is required");
  }
  if (!isAllowedProfilePhotoType(file.type)) {
    throw new Error("Unsupported image type. Allowed: JPEG, PNG, WEBP.");
  }
  if (file.size <= 0 || file.size > MAX_PROFILE_PHOTO_BYTES) {
    throw new Error(
      `Photo must be between 1 byte and ${MAX_PROFILE_PHOTO_BYTES} bytes`,
    );
  }
}

export function buildProfilePhotoPath(userId: string, fileName: string): string {
  const rawExt = fileName.includes(".")
    ? fileName.split(".").pop()!.toLowerCase().replace(/[^a-z0-9]/g, "")
    : "jpg";
  const ext =
    rawExt === "jpeg" || rawExt === "jpg" || rawExt === "png" || rawExt === "webp"
      ? rawExt === "jpeg"
        ? "jpg"
        : rawExt
      : "jpg";
  return `profiles/${userId}/avatar.${ext}`;
}
