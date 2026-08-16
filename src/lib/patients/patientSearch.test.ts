import { describe, expect, it } from "vitest";
import {
  matchesPatientQuery,
  normalizePatientCodeQuery,
  patientSearchBlob,
} from "./patientSearch";

describe("patientSearch", () => {
  const patient = {
    displayName: "Ana López",
    email: "ana@example.com",
    patientNumber: "TE-D23E-AA4BE9",
  };

  it("normalizes TE codes", () => {
    expect(normalizePatientCodeQuery("TE-D23E-AA4BE9")).toBe("ted23eaa4be9");
  });

  it("matches name, email and TE code (with/without hyphens)", () => {
    expect(matchesPatientQuery("ana", patient)).toBe(true);
    expect(matchesPatientQuery("ana@example", patient)).toBe(true);
    expect(matchesPatientQuery("TE-D23E", patient)).toBe(true);
    expect(matchesPatientQuery("ted23eaa4", patient)).toBe(true);
    expect(matchesPatientQuery("zzz", patient)).toBe(false);
  });

  it("builds searchable blob", () => {
    const blob = patientSearchBlob(patient).toLowerCase();
    expect(blob).toContain("te-d23e-aa4be9");
    expect(blob).toContain("ted23eaa4be9");
  });
});
