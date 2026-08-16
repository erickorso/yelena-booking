import { describe, expect, it } from "vitest";
import {
  getFirebaseAuthErrorCode,
  mapFirebaseAuthErrorKey,
} from "@/lib/auth/firebaseAuthErrors";

describe("firebaseAuthErrors", () => {
  it("reads code from Firebase-like error object", () => {
    expect(
      getFirebaseAuthErrorCode({ code: "auth/invalid-email", message: "x" }),
    ).toBe("auth/invalid-email");
  });

  it("parses code from legacy message string", () => {
    expect(
      getFirebaseAuthErrorCode(
        new Error("Firebase: Error (auth/invalid-email)."),
      ),
    ).toBe("auth/invalid-email");
  });

  it("maps invalid-email to invalidEmail key", () => {
    expect(
      mapFirebaseAuthErrorKey({ code: "auth/invalid-email" }),
    ).toBe("invalidEmail");
  });

  it("maps unknown to generic", () => {
    expect(mapFirebaseAuthErrorKey(new Error("boom"))).toBe("generic");
  });
});
