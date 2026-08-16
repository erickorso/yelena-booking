import { describe, expect, it } from "vitest";
import {
  canonicalizeSpecialty,
  DEFAULT_SPECIALTIES,
  mergeSpecialtyCatalog,
  normalizeSpecialty,
} from "./catalog";

describe("specialty catalog", () => {
  it("normalizes accents for matching", () => {
    expect(normalizeSpecialty("Cardiología")).toBe(
      normalizeSpecialty("Cardiologia"),
    );
  });

  it("canonicalizes to default spelling", () => {
    expect(canonicalizeSpecialty("cardiologia", DEFAULT_SPECIALTIES)).toBe(
      "Cardiología",
    );
  });

  it("merges custom without duplicates", () => {
    const merged = mergeSpecialtyCatalog(DEFAULT_SPECIALTIES, [
      "Cardiologia",
      "Homeopatía",
    ]);
    expect(merged.filter((s) => normalizeSpecialty(s) === "cardiologia")).toHaveLength(
      1,
    );
    expect(merged).toContain("Homeopatía");
  });
});
