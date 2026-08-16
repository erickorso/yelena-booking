import { describe, expect, it } from "vitest";
import {
  assertValidProfilePhoto,
  buildProfilePhotoPath,
  MAX_PROFILE_PHOTO_BYTES,
} from "@/lib/storage/profilePhotoPolicy";

describe("profilePhotoPolicy", () => {
  it("accepts jpeg under size limit", () => {
    expect(() =>
      assertValidProfilePhoto({
        name: "me.jpg",
        type: "image/jpeg",
        size: 1024,
      }),
    ).not.toThrow();
  });

  it("rejects pdf", () => {
    expect(() =>
      assertValidProfilePhoto({
        name: "x.pdf",
        type: "application/pdf",
        size: 100,
      }),
    ).toThrow(/Unsupported/);
  });

  it("rejects oversized", () => {
    expect(() =>
      assertValidProfilePhoto({
        name: "big.png",
        type: "image/png",
        size: MAX_PROFILE_PHOTO_BYTES + 1,
      }),
    ).toThrow();
  });

  it("builds stable avatar path", () => {
    expect(buildProfilePhotoPath("uid1", "photo.JPEG")).toBe(
      "profiles/uid1/avatar.jpg",
    );
  });
});
