import { describe, expect, it } from "vitest";
import { derivePatientNumber } from "./patientNumber";

describe("derivePatientNumber", () => {
  it("is stable for the same id", () => {
    expect(derivePatientNumber("uid-abc")).toBe(derivePatientNumber("uid-abc"));
  });

  it("differs across ids", () => {
    expect(derivePatientNumber("a")).not.toBe(derivePatientNumber("b"));
  });

  it("matches TE-XXXX-XXXXXX", () => {
    expect(derivePatientNumber("uid-1")).toMatch(/^TE-[0-9A-F]{4}-[0-9A-F]{6}$/);
  });
});
