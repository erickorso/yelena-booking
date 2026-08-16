import { describe, expect, it } from "vitest";
import {
  isPlaceholderDisplayName,
  resolveDisplayName,
} from "./displayName";

describe("resolveDisplayName", () => {
  it("prefers Google over placeholder", () => {
    expect(
      resolveDisplayName({
        preferred: "Usuario Yelena",
        googleName: "Erick Vargas",
        email: "erickorso@gmail.com",
      }),
    ).toBe("Erick Vargas");
  });

  it("keeps a real typed name", () => {
    expect(
      resolveDisplayName({
        preferred: "Ana López",
        googleName: "Ana Google",
        email: "a@b.com",
      }),
    ).toBe("Ana López");
  });
});

describe("isPlaceholderDisplayName", () => {
  it("detects legacy placeholders", () => {
    expect(isPlaceholderDisplayName("Usuario Thaydee Elena")).toBe(true);
    expect(isPlaceholderDisplayName("Usuario Yelena")).toBe(true);
    expect(isPlaceholderDisplayName("Erick")).toBe(false);
  });
});
